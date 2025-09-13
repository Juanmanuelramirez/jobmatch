// Importar las librerías necesarias
const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');
const { pipeline, cos_sim } = await import('@xenova/transformers');

// --- RESUMEN DEL CV (para el análisis de IA) ---
// Este es un resumen de tus habilidades clave, extraído de tu CV.
const cvSummary = `Strategic Program Manager with over 10 years of experience in global cloud initiatives (AWS, GCP), Agile transformation (Scrum, SAFe), and leading cross-functional teams. Expert in cloud migrations, CI/CD automation, and cloud governance. Certified AWS Solutions Architect and Scrum Master.`;

// --- FUNCIÓN DE ANÁLISIS DE IA ---
// Esta función calcula la similitud entre tu CV y la descripción de una vacante.
async function calculateSimilarity(jobDescription) {
    try {
        const extractor = await pipeline('feature-extraction', 'sentence-transformers/all-MiniLM-L6-v2');
        const [cvEmbedding, jobEmbedding] = await Promise.all([
            extractor(cvSummary, { pooling: 'mean', normalize: true }),
            extractor(jobDescription, { pooling: 'mean', normalize: true })
        ]);
        
        const similarity = cos_sim(cvEmbedding.data, jobEmbedding.data);
        return Math.round(similarity * 100);
    } catch (error) {
        console.error("Error en el cálculo de similitud:", error);
        return 0; // Devolver 0 si falla el análisis
    }
}

// --- LÓGICA DE SCRAPING (Ejemplo con LinkedIn) ---
// Nota: Cada sitio web tiene una estructura HTML diferente. Los selectores para OCC y Computrabajo
// tendrían que ser investigados y añadidos en sus propias funciones.
async function scrapeLinkedIn(browser) {
    const page = await browser.newPage();
    const LINKEDIN_SESSION_COOKIE = process.env.LINKEDIN_SESSION_COOKIE;

    if (LINKEDIN_SESSION_COOKIE) {
        // Usar la cookie de sesión para una mejor experiencia de scraping
        await page.setCookie({
            name: 'li_at',
            value: LINKEDIN_SESSION_COOKIE,
            domain: '.linkedin.com',
        });
    }

    const searchUrl = 'https://www.linkedin.com/jobs/search/?keywords=program%20manager%20cloud%20agile&location=Mexico&f_TPR=r604800&f_WT=2&geoId=103323332&trk=public_jobs_jobs-search-bar_search-submit&position=1&pageNum=0';
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('ul.jobs-search__results-list li');

    const jobResults = await page.evaluate(() => {
        const jobs = [];
        const jobElements = document.querySelectorAll('ul.jobs-search__results-list li');
        
        jobElements.forEach(job => {
            const title = job.querySelector('h3.base-search-card__title')?.innerText.trim();
            const company = job.querySelector('h4.base-search-card__subtitle')?.innerText.trim();
            const url = job.querySelector('a.base-card__full-link')?.href;
            
            if (title && company && url && jobs.length < 10) {
                jobs.push({ title, company, url, lang: 'en', recruiter_name: 'Not found', recruiter_email: 'Not found' });
            }
        });
        return jobs;
    });

    // En una implementación más avanzada, se podría navegar a cada URL para obtener la descripción
    // y buscar al reclutador. Por ahora, lo simulamos para no hacer la función demasiado lenta.
    for (const job of jobResults) {
        job.match = await calculateSimilarity(`Title: ${job.title}. Company: ${job.company}.`); // Simulación de descripción
    }
    
    return jobResults;
}

// --- PLANTILLAS DE MENSAJE ---
const messageTemplates = {
    es: (job, match) => `Hola equipo de reclutamiento de ${job.company}, ... (Mensaje en español)`,
    en: (job, match) => `Dear ${job.company} Hiring Team,

My name is Juan Manuel Ramírez, and I am writing to express my strong interest in the **${job.title}** position I found on LinkedIn.

With a **${match}% match** to my profile, I am confident my background as a Strategic Program Manager with over 10 years of experience in cloud initiatives (AWS/GCP) and Agile transformations aligns perfectly with your requirements. My experience in leading complex migrations and enhancing cloud governance has prepared me to deliver significant value to your team.

I am eager to discuss how I can contribute to your goals. Thank you for your consideration.

Best regards,
Juan Manuel Ramírez Sosa`,
};


// --- HANDLER PRINCIPAL DE LA API ---
export default async function handler(request, response) {
    let browser = null;
    try {
        const { platform } = request.query;

        // Iniciar el navegador headless
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
            // Aquí irían las llamadas a las funciones para OCC y Computrabajo
            jobs = [{ title: `Scraper para ${platform} no implementado`, company: 'Próximamente', url: '#', lang: 'es', recruiter_name: '', recruiter_email: '', match: 0 }];
        }
        
        // Generar los mensajes personalizados
        const jobsWithMessages = jobs.map(job => {
            const template = messageTemplates[job.lang] || messageTemplates.es;
            return {
                ...job,
                platform: platform.charAt(0).toUpperCase() + platform.slice(1),
                message: template(job, job.match || 0)
            };
        });

        response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // Cache por 1 hora
        response.status(200).json(jobsWithMessages);

    } catch (error) {
        console.error("Error en la función serverless:", error);
        response.status(500).json({ error: 'No se pudieron obtener las vacantes. Intenta más tarde.' });
    } finally {
        if (browser !== null) {
            await browser.close();
        }
    }
}

