const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const axios = require('axios');
const cheerio = require('cheerio');

const CACHE_FILE = path.join(os.tmpdir(), 'jobs-cache.json');
const CACHE_DURATION_HOURS = 4;

// --- Funciones de Scraping ---

async function scrapeOCC() {
    console.log("Iniciando scraping de OCCMundial...");
    try {
        const url = 'https://www.occ.com.mx/empleos/de-program-manager/remoto-desde-casa/';
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }});
        const $ = cheerio.load(data);
        const jobs = [];

        $('div.job-card-container').each((i, el) => {
            if (jobs.length >= 10) return;
            const title = $(el).find('h2 a').text().trim();
            const company = $(el).find('div.company-name a').text().trim();
            const jobUrl = $(el).find('h2 a').attr('href');
            
            if (title && company && jobUrl && title.toLowerCase().includes('program manager')) {
                jobs.push({
                    title,
                    company,
                    url: `https://www.occ.com.mx${jobUrl}`,
                    recruiter_name: null,
                    recruiter_email: null,
                    message: `Estimado equipo de contratación de ${company},\n\nCon gran interés me dirijo a ustedes para presentar mi candidatura para la posición de ${title} que encontré en OCCMundial. Como Strategic Program Manager con más de 10 años de experiencia en la entrega de iniciativas globales de nube y transformación Agile, mi perfil se alinea estrechamente con los desafíos y oportunidades del rol.\n\nHe liderado migraciones complejas a AWS y GCP, y estoy certificado como AWS Solutions Architect. Mi experiencia coordinando equipos multifuncionales en LATAM, India y EE.UU. me ha permitido optimizar los pipelines de entrega y asegurar la alineación de la tecnología con los objetivos de negocio. Estaría encantado de conversar sobre cómo mi experiencia puede aportar valor a su equipo.\n\nGracias por su tiempo y consideración.\n\nAtentamente,\nJuan Manuel Ramírez Sosa`
                });
            }
        });
        console.log(`Scraping de OCCMundial finalizado. Se encontraron ${jobs.length} vacantes.`);
        return jobs;
    } catch (error) {
        console.error("Error en scraping de OCCMundial:", error.message);
        return [];
    }
}

async function scrapeComputrabajo() {
    console.log("Iniciando scraping de Computrabajo...");
    try {
        const url = 'https://mx.computrabajo.com/trabajos-de-program-manager-en-remoto';
         const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }});
        const $ = cheerio.load(data);
        const jobs = [];

        $('article.box_offer').each((i, el) => {
            if (jobs.length >= 10) return;
            const title = $(el).find('h1.fs18 a').text().trim();
            const company = $(el).find('div.fs16 a').text().trim();
            const jobUrl = $(el).find('h1.fs18 a').attr('href');

            if (title && company && jobUrl) {
                jobs.push({
                    title,
                    company,
                    url: `https://mx.computrabajo.com${jobUrl}`,
                    recruiter_name: null,
                    recruiter_email: null,
                    message: `Hola equipo de reclutamiento de ${company},\n\nLes escribo con gran interés por la vacante de ${title} que publicaron en Computrabajo. Mi nombre es Juan Manuel Ramírez Sosa, y soy un Strategic Program Manager con una década de experiencia liderando proyectos de nube y transformaciones ágiles a nivel global.\n\nMi trayectoria incluye la gestión exitosa de migraciones a la nube (AWS/GCP), la implementación de CI/CD y la gobernanza de nube, coordinando equipos en diversas geografías. Como Scrum Master y AWS Solutions Architect certificado, tengo una base sólida tanto en metodologías ágiles como en tecnología cloud.\n\nMe entusiasma la posibilidad de aportar mi experiencia a su organización y estoy a su disposición para conversar más a fondo. Adjunto mi CV para su revisión.\n\nSaludos cordiales,\nJuan Manuel Ramírez Sosa`
                });
            }
        });
        console.log(`Scraping de Computrabajo finalizado. Se encontraron ${jobs.length} vacantes.`);
        return jobs;
    } catch (error) {
        console.error("Error en scraping de Computrabajo:", error.message);
        return [];
    }
}

async function scrapeLinkedIn(apiKey) {
    if (!apiKey) {
        console.log("No se proporcionó API key para scraping de LinkedIn. Omitiendo.");
        return [{ title: "Configuración Requerida", company: "Por favor, añade tu API Key de scraping en Vercel para ver vacantes reales de LinkedIn.", url: "#", message: "La API Key es necesaria para hacer scraping en vivo en LinkedIn." }];
    }
    console.log("Iniciando scraping de LinkedIn con API...");
    try {
        const targetUrl = 'https://www.linkedin.com/jobs/search?keywords=Program%20Manager&location=Mexico&f_TPR=r86400&f_WT=2&geoId=103332223&trk=public_jobs_jobs-search-bar_search-submit&position=1&pageNum=0';
        // Usamos un servicio como ScraperAPI. Elige el que prefieras.
        const apiUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}`;
        
        const { data } = await axios.get(apiUrl, { headers: { 'Accept-Encoding': 'gzip, deflate, br' }});
        const $ = cheerio.load(data);
        const jobs = [];

        $('div.base-card').each((i, el) => {
            if (jobs.length >= 10) return;

            const title = $(el).find('h3.base-search-card__title').text().trim();
            const company = $(el).find('h4.base-search-card__subtitle a').text().trim();
            const jobUrl = $(el).find('a.base-card__full-link').attr('href');

            if (title && company && jobUrl) {
                 jobs.push({
                    title,
                    company,
                    url: jobUrl.split('?')[0], // Limpiar URL
                    recruiter_name: null, 
                    recruiter_email: null,
                    message: `Dear Hiring Team at ${company},\n\nI am writing to express my keen interest in the ${title} position I found on LinkedIn. As a Strategic Program Manager with over 10 years of experience in global cloud and Agile initiatives, my background in leading complex migrations to AWS and GCP aligns perfectly with this role's requirements.\n\nI have a proven track record of coordinating cross-functional teams across LATAM, India, and the U.S., enhancing CI/CD automation, and improving cloud governance. My certifications as an AWS Solutions Architect and Scrum Master further solidify my technical and methodological expertise.\n\nI am confident that my skills can bring significant value to your team. Thank you for your time and consideration.\n\nBest regards,\nJuan Manuel Ramírez Sosa`
                });
            }
        });
        console.log(`Scraping de LinkedIn finalizado. Se encontraron ${jobs.length} vacantes.`);
        return jobs;
    } catch (error) {
        console.error("Error en scraping de LinkedIn:", error.response ? error.response.status : error.message);
        return [{ title: "Error al Scrapear LinkedIn", company: "No se pudo obtener la información. Revisa tu API key o intenta más tarde.", url: "#", message: "Hubo un error al contactar el servicio de scraping. Por favor, verifica que tu API key sea correcta y que tu plan de servicio esté activo."}];
    }
}


// --- Lógica Principal del Handler ---

module.exports = async (req, res) => {
    const { platform } = req.query;
    if (!platform) {
        return res.status(400).json({ message: 'Platform parameter is required.' });
    }

    try {
        const cacheData = await readCache();
        if (cacheData && cacheData[platform]) {
            console.log(`Sirviendo datos para ${platform} desde el caché.`);
            return res.status(200).json(cacheData[platform]);
        }

        console.log('Caché no encontrado o expirado. Realizando scraping en vivo...');
        const scrapingApiKey = process.env.SCRAPING_API_KEY;

        const [occ, computrabajo, linkedin] = await Promise.all([
            scrapeOCC(),
            scrapeComputrabajo(),
            scrapeLinkedIn(scrapingApiKey)
        ]);
        
        const allJobs = { occ, computrabajo, linkedin };

        await writeCache(allJobs);
        
        if (allJobs[platform]) {
            return res.status(200).json(allJobs[platform]);
        } else {
            return res.status(404).json({ message: 'Platform not found.' });
        }

    } catch (error) {
        console.error("Error en el handler principal:", error);
        return res.status(500).json({ message: 'Ocurrió un error interno al procesar la solicitud.' });
    }
};


// --- Funciones de Caché ---
async function readCache() {
    try {
        const stats = await fs.stat(CACHE_FILE);
        const fileAgeHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
        if (fileAgeHours > CACHE_DURATION_HOURS) {
            console.log("El caché ha expirado.");
            return null;
        }
        const fileContent = await fs.readFile(CACHE_FILE, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log("El archivo de caché no existe.");
        } else {
            console.error("Error al leer el caché:", error);
        }
        return null;
    }
}

async function writeCache(data) {
    try {
        await fs.writeFile(CACHE_FILE, JSON.stringify(data, null, 2));
        console.log("Caché actualizado exitosamente en:", CACHE_FILE);
    } catch (error) {
        console.error("Error al escribir en el caché:", error);
    }
}

