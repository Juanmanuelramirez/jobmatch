import puppeteer from 'puppeteer-core';
import chromium from 'chrome-aws-lambda';
import fs from 'fs/promises';
import path from 'path';

// --- CONFIGURACIÓN ---
const CACHE_FILE_PATH = path.join('/tmp', 'jobs.json');
const CACHE_DURATION_HOURS = 4;
const CV_SUMMARY = `Strategic Program Manager con más de 10 años de experiencia en iniciativas de nube (AWS, GCP), metodologías ágiles (Scrum, Kanban, SAFe), CI/CD y liderazgo de equipos globales. Experto en migraciones a la nube y gobernanza.`;

// --- FUNCIÓN HANDLER (PUNTO DE ENTRADA) ---
export default async function handler(request, response) {
  try {
    const cachedData = await readCache();
    if (cachedData) {
      console.log('Sirviendo datos desde el CACHÉ.');
      return response.status(200).json(cachedData);
    }

    console.log('Caché no encontrado o expirado. Realizando scraping en vivo...');
    const freshData = await scrapeAndProcess();
    await writeCache(freshData);
    
    return response.status(200).json(freshData);

  } catch (error) {
    console.error('Error en el handler principal:', error);
    return response.status(500).json({ error: 'No se pudieron obtener las vacantes.', details: error.message });
  }
}

// --- LÓGICA DE CACHÉ ---
async function readCache() {
  try {
    const stats = await fs.stat(CACHE_FILE_PATH);
    const cacheAgeHours = (new Date() - new Date(stats.mtime)) / 1000 / 3600;
    if (cacheAgeHours < CACHE_DURATION_HOURS) {
      const data = await fs.readFile(CACHE_FILE_PATH, 'utf-8');
      return JSON.parse(data);
    }
    return null; // Cache expirado
  } catch (error) {
    return null; // No hay caché
  }
}

async function writeCache(data) {
  await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(data, null, 2));
  console.log('Resultados guardados en caché en:', CACHE_FILE_PATH);
}

// --- LÓGICA DE SCRAPING ---
async function scrapeAndProcess() {
  let browser = null;
  const allJobs = {
    occ: [],
    computrabajo: [],
  };

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    allJobs.occ = await scrapeOCC(browser);
    allJobs.computrabajo = await scrapeComputrabajo(browser);
    
    return allJobs;

  } catch (error) {
    console.error('Error durante el proceso de scraping:', error);
    throw new Error('El proceso de scraping falló.');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// --- SCRAPERS INDIVIDUALES (SIN CAMBIOS) ---
async function scrapeOCC(browser) {
  const platform = 'OCCMundial';
  const page = await browser.newPage();
  await page.goto('https://www.occ.com.mx/empleos/de-program-manager/remoto/', { waitUntil: 'networkidle2' });
  const jobs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.job-card-container')).slice(0, 10).map(card => ({
      title: card.querySelector('a.truncate')?.innerText.trim() || 'No disponible',
      company: card.querySelector('div > div > div > div > a > span')?.innerText.trim() || 'No disponible',
      url: card.querySelector('a.truncate') ? `https://www.occ.com.mx${card.querySelector('a.truncate').getAttribute('href')}` : null,
    }));
  });
  await page.close();
  return generatePersonalizedMessages(jobs, CV_SUMMARY);
}

async function scrapeComputrabajo(browser) {
  const platform = 'Computrabajo';
  const page = await browser.newPage();
  await page.goto('https://mx.computrabajo.com/trabajo-de-program-manager-en-remoto', { waitUntil: 'networkidle2' });
  const jobs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('article.box_offer')).slice(0, 10).map(card => ({
      title: card.querySelector('h1.fs18 a')?.innerText.trim() || 'No disponible',
      company: card.querySelector('.it-blank')?.innerText.trim() || 'No disponible',
      url: card.querySelector('h1.fs18 a')?.href || null,
    }));
  });
  await page.close();
  return generatePersonalizedMessages(jobs, CV_SUMMARY);
}

// --- GENERADOR DE MENSAJES ---
function generatePersonalizedMessages(jobs, cvSummary) {
    return jobs.map(job => {
        job.recruiter_name = 'No disponible (requiere visita)';
        job.recruiter_email = null;
        job.match_percentage = 0;
        job.message = `Hola, equipo de reclutamiento de ${job.company},

Mi nombre es Juan Manuel Ramírez y les escribo con gran interés por la vacante de "${job.title}".

Como Strategic Program Manager con más de 10 años de experiencia liderando iniciativas globales de nube (AWS, GCP) y transformaciones Agile, mi perfil se alinea fuertemente con los desafíos del sector tecnológico actual. Mi experiencia en la gestión de equipos multiculturales y en la ejecución de migraciones complejas me ha permitido optimizar la entrega de valor y mejorar la eficiencia operativa.

Me encantaría tener la oportunidad de conversar sobre cómo mi experiencia puede contribuir al éxito de sus proyectos.

Gracias por su tiempo y consideración.

Saludos cordiales,
Juan Manuel Ramírez`;
        return job;
    });
}

