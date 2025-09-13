import puppeteer from 'puppeteer-core';
import chromium from 'chrome-aws-lambda';
import { pipeline, cos_sim } from '@xenova/transformers';
import fs from 'fs';
import path from 'path';

// --- Constantes y Configuración ---
console.log('--- Iniciando script de scraping y análisis ---');
const CV_SUMMARY = `Strategic Program Manager with over 10 years of experience in global cloud initiatives (AWS, GCP), Agile transformation (Scrum, SAFe), and leading cross-functional teams. Expert in cloud migrations, CI/CD automation, and cloud governance. Certified AWS Solutions Architect and Scrum Master.`;
const OUTPUT_DIR = path.join(process.cwd(), 'public');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'jobs.json');

// --- Lógica de IA ---
async function calculateSimilarity(extractor, jobDescription) {
    if (!jobDescription) return 0;
    try {
        const embeddings = await extractor([CV_SUMMARY, jobDescription], { pooling: 'mean', normalize: true });
        return Math.round(cos_sim(embeddings[0].data, embeddings[1].data) * 100);
    } catch (error) {
        console.error(`Error calculando similitud.`, error.message);
        return 0;
    }
}

// --- Lógica de Scraping para LinkedIn ---
async function scrapeLinkedIn(browser, extractor) {
    console.log('[LinkedIn] Iniciando scraping...');
    const page = await browser.newPage();
    const LINKEDIN_SESSION_COOKIE = process.env.LINKEDIN_SESSION_COOKIE;

    if (LINKEDIN_SESSION_COOKIE && LINKEDIN_SESSION_COOKIE.length > 10) {
        console.log('[LinkedIn] Cookie de sesión encontrada. Configurándola...');
        await page.setCookie({ name: 'li_at', value: LINKEDIN_SESSION_COOKIE, domain: '.linkedin.com' });
    } else {
        console.warn("[LinkedIn] ADVERTENCIA: La variable de entorno LINKEDIN_SESSION_COOKIE no está configurada o es muy corta. El scraping probablemente fallará.");
    }

    const searchUrl = 'https://www.linkedin.com/jobs/search/?keywords=program%20manager%20cloud%20agile&location=Mexico&f_TPR=r604800&f_WT=2&geoId=103323332&sortBy=DD';
    console.log(`[LinkedIn] Navegando a: ${searchUrl}`);
    
    try {
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 25000 });
        console.log('[LinkedIn] Página cargada. Esperando por el selector de la lista de trabajos...');
        await page.waitForSelector('ul.jobs-search__results-list li', { timeout: 15000 });
        console.log('[LinkedIn] Selector encontrado. Extrayendo datos...');
    } catch (e) {
        console.error('[LinkedIn] Error fatal: No se pudo encontrar el selector de trabajos. Es probable que LinkedIn haya bloqueado la solicitud o haya pedido un CAPTCHA.');
        console.error(e.message);
        return []; // Devuelve un array vacío para no detener todo el proceso.
    }

    const jobResults = await page.evaluate(() =>
        Array.from(document.querySelectorAll('ul.jobs-search__results-list li'), job => ({
            title: job.querySelector('h3.base-search-card__title')?.innerText.trim(),
            company: job.querySelector('h4.base-search-card__subtitle')?.innerText.trim(),
            url: job.querySelector('a.base-card__full-link')?.href,
        })).filter(j => j.title && j.company && j.url).slice(0, 10)
    );

    if (jobResults.length === 0) {
        console.warn("[LinkedIn] No se extrajeron vacantes. La estructura de la página puede haber cambiado o la sesión es inválida.");
        return [];
    }
    
    console.log(`[LinkedIn] Se encontraron ${jobResults.length} vacantes. Analizando con IA...`);

    for (const job of jobResults) {
        const jobText = `Job Title: ${job.title}. Company: ${job.company}.`;
        job.match = await calculateSimilarity(extractor, jobText);
        job.lang = 'en';
        job.recruiter_name = 'Not Found';
        job.recruiter_email = 'Not Found';
    }
    
    console.log('[LinkedIn] Análisis de IA completado.');
    await page.close();
    return jobResults;
}

// --- Plantillas de Mensajes ---
const messageTemplates = {
    en: (job, match) => `Dear ${job.company} Hiring Team,\n\nMy name is Juan Manuel Ramírez, and I am writing to express my strong interest in the **${job.title}** position.\n\nWith a **${match}% match** to my profile, I am confident my background as a Strategic Program Manager with over 10 years of experience in cloud initiatives (AWS/GCP) and Agile transformations aligns perfectly with your requirements.\n\nI am eager to discuss how I can contribute to your goals. Thank you for your consideration.\n\nBest regards,\nJuan Manuel Ramírez Sosa`,
};

// --- Función Principal ---
async function main() {
    let browser = null;
    const allJobs = { linkedin: [], occ: [], computrabajo: [] };

    try {
        console.log('Cargando modelo de IA...');
        const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        console.log('Modelo de IA cargado exitosamente.');

        console.log('Iniciando navegador headless...');
        browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
        });
        console.log('Navegador iniciado.');
        
        const linkedinJobs = await scrapeLinkedIn(browser, extractor);
        allJobs.linkedin = linkedinJobs.map(job => ({ ...job, message: messageTemplates.en(job, job.match) }));
        
        // Aquí podrías añadir scrapers para OCC y Computrabajo

    } catch (error) {
        console.error('--- ERROR CRÍTICO EN LA FUNCIÓN PRINCIPAL ---');
        console.error(error);
        allJobs.error = error.message;
    } finally {
        if (browser) {
            console.log('Cerrando navegador...');
            await browser.close();
        }
        
        console.log('Asegurando que el directorio de salida exista...');
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR);
        }
        
        console.log(`Escribiendo resultados en ${OUTPUT_FILE}...`);
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allJobs, null, 2));
        console.log('--- Proceso de scraping finalizado. ---');
        // process.exit() es manejado por el entorno de build de Vercel.
    }
}

main();

