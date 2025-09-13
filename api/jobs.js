const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

// --- Singleton para el Pipeline de IA ---
// Esto asegura que el modelo se cargue UNA SOLA VEZ por instancia de la función,
// evitando timeouts en llamadas subsecuentes (cold starts).
let pipelineInstance = null;
const getPipeline = async () => {
    if (pipelineInstance === null) {
        const { pipeline } = await import('@xenova/transformers');
        // Usamos un modelo más pequeño y rápido, optimizado para estos entornos.
        pipelineInstance = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return pipelineInstance;
};

const cvSummary = `Strategic Program Manager with over 10 years of experience in global cloud initiatives (AWS, GCP), Agile transformation (Scrum, SAFe), and leading cross-functional teams. Expert in cloud migrations, CI/CD automation, and cloud governance. Certified AWS Solutions Architect and Scrum Master.`;

async function calculateSimilarity(jobDescription) {
    try {
        const extractor = await getPipeline();
        const { cos_sim } = await import('@xenova/transformers');

        const embeddings = await extractor([cvSummary, jobDescription], { pooling: 'mean', normalize: true });
        
        // Extraer los datos de los tensores de una manera segura
        const cvEmbedding = embeddings[0].data;
        const jobEmbedding = embeddings[1].data;

        if (!cvEmbedding || !jobEmbedding) {
             console.warn("No se pudieron generar los embeddings.");
             return 0;
        }

        const similarity = cos_sim(cvEmbedding, jobEmbedding);
        return Math.round(similarity * 100);
    } catch (error) {
        console.error("Error en el cálculo de similitud:", error);
        return 0;
    }
}

async function scrapeLinkedIn(browser) {
    const page = await browser.newPage();
    const LINKEDIN_SESSION_COOKIE = process.env.LINKEDIN_SESSION_COOKIE;

    if (LINKEDIN_SESSION_COOKIE) {
        await page.setCookie({ name: 'li_at', value: LINKEDIN_SESSION_COOKIE, domain: '.linkedin.com' });
    } else {
        console.warn("La cookie de sesión de LinkedIn no está configurada. El scraping puede fallar o devolver resultados limitados.");
    }

    const searchUrl = 'https://www.linkedin.com/jobs/search/?keywords=program%20manager%20cloud%20agile&location=Mexico&f_TPR=r604800&f_WT=2&geoId=103323332';
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    
    // Espera explícita para que el contenido cargue
    await page.waitForSelector('ul.jobs-search__results-list li', { timeout: 10000 });

    const jobResults = await page.evaluate(() => 
        Array.from(document.querySelectorAll('ul.jobs-search__results-list li'), job => {
            const title = job.querySelector('h3.base-search-card__title')?.innerText.trim();
            const company = job.querySelector('h4.base-search-card__subtitle')?.innerText.trim();
            const url = job.querySelector('a.base-card__full-link')?.href;
            return { title, company, url };
        }).filter(j => j.title && j.company && j.url).slice(0, 10)
    );
    
    // Calcula la similitud para cada vacante
    await Promise.all(jobResults.map(async (job) => {
        // En una versión ideal, navegaríamos a cada URL para obtener la descripción completa.
        // Por ahora, usamos el título y la compañía para una aproximación rápida.
        const jobText = `Job Title: ${job.title}. Company: ${job.company}.`;
        job.match = await calculateSimilarity(jobText);
        job.lang = 'en'; // Asumimos inglés para LinkedIn
        job.recruiter_name = 'Not Found';
        job.recruiter_email = 'Not Found';
    }));

    return jobResults;
}

const messageTemplates = {
    en: (job, match) => `Dear ${job.company} Hiring Team,\n\nMy name is Juan Manuel Ramírez, and I am writing to express my strong interest in the **${job.title}** position I found on LinkedIn.\n\nWith a **${match}% match** to my profile, I am confident my background as a Strategic Program Manager with over 10 years of experience in cloud initiatives (AWS/GCP) and Agile transformations aligns perfectly with your requirements. My experience in leading complex migrations and enhancing cloud governance has prepared me to deliver significant value to your team.\n\nI am eager to discuss how I can contribute to your goals. Thank you for your consideration.\n\nBest regards,\nJuan Manuel Ramírez Sosa`,
};

export default async function handler(request, response) {
    let browser = null;
    try {
        const { platform } = request.query;

        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
        });

        let jobs = [];
        if (platform === 'linkedin') {
            jobs = await scrapeLinkedIn(browser);
        } else {
            jobs = [{ title: `Scraper for ${platform} is not yet implemented.`, company: 'Coming soon', url: '#', lang: 'en', match: 0 }];
        }
        
        const jobsWithMessages = jobs.map(job => {
            const template = messageTemplates[job.lang] || messageTemplates.en;
            return {
                ...job,
                platform: platform.charAt(0).toUpperCase() + platform.slice(1),
                message: template(job, job.match || 0)
            };
        });

        response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        return response.status(200).json(jobsWithMessages);

    } catch (error) {
        console.error("Error in serverless function handler:", error);
        return response.status(500).json({ error: 'Failed to fetch job listings. The server took too long to respond or an internal error occurred.' });
    } finally {
        if (browser !== null) {
            await browser.close();
        }
    }
}
