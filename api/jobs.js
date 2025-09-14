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

function getLinkedInJobs() {
    console.log("Generando datos simulados para LinkedIn...");
    const jobs = [
        { title: "Technical Program Manager, Cloud Infrastructure", company: "Oracle", url: "https://www.linkedin.com/jobs/", recruiter_name: "Ana García", recruiter_email: "ana.garcia@example.com" },
        { title: "Sr. Program Manager, AWS Professional Services", company: "Amazon Web Services (AWS)", url: "https://www.linkedin.com/jobs/", recruiter_name: "Luis Hernandez", recruiter_email: "luis.h@example.com" },
        { title: "Agile Program Manager (FinTech)", company: "Stripe", url: "https://www.linkedin.com/jobs/", recruiter_name: "Sofia Castillo", recruiter_email: "sofia.c@example.com" },
        { title: "Program Manager, Google Cloud", company: "Google", url: "https://www.linkedin.com/jobs/", recruiter_name: "David Morales", recruiter_email: "david.m@example.com" },
        { title: "Remote Program Manager, IT", company: "Microsoft", url: "https://www.linkedin.com/jobs/", recruiter_name: "Elena Torres", recruiter_email: "elena.t@example.com" },
    ];
    // Mensaje en inglés para vacantes en inglés
    return jobs.map(job => ({ ...job, message: `Dear ${job.recruiter_name || 'Hiring Team'} at ${job.company},\n\nI am writing to express my keen interest in the ${job.title} position I found on LinkedIn. As a Strategic Program Manager with over 10 years of experience in global cloud and Agile initiatives, my background in leading complex migrations to AWS and GCP aligns perfectly with this role's requirements.\n\nI have a proven track record of coordinating cross-functional teams across LATAM, India, and the U.S., enhancing CI/CD automation, and improving cloud governance. My certifications as an AWS Solutions Architect and Scrum Master further solidify my technical and methodological expertise.\n\nI am confident that my skills can bring significant value to your team. Thank you for your time and consideration.\n\nBest regards,\nJuan Manuel Ramírez Sosa`}));
}


// --- Lógica Principal del Handler ---

module.exports = async (req, res) => {
    const { platform } = req.query;
    if (!platform) {
        return res.status(400).json({ message: 'Platform parameter is required.' });
    }

    try {
        // 1. Intentar leer desde el caché
        const cacheData = await readCache();
        if (cacheData && cacheData[platform]) {
            console.log(`Sirviendo datos para ${platform} desde el caché.`);
            return res.status(200).json(cacheData[platform]);
        }

        // 2. Si el caché no existe o está expirado, hacer scraping
        console.log('Caché no encontrado o expirado. Realizando scraping en vivo...');
        const [occ, computrabajo, linkedin] = await Promise.all([
            scrapeOCC(),
            scrapeComputrabajo(),
            getLinkedInJobs()
        ]);
        
        const allJobs = { occ, computrabajo, linkedin };

        // 3. Escribir los nuevos resultados al caché
        await writeCache(allJobs);
        
        // 4. Devolver los resultados para la plataforma solicitada
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

