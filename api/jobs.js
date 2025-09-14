const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const axios = require('axios');
const cheerio = require('cheerio');

const CACHE_FILE = path.join(os.tmpdir(), 'jobs-cache.json');
const CACHE_DURATION_HOURS = 4;

// --- Funciones de Scraping ---

async function scrapeOCC() {
    // ... (El código para OCCMundial permanece igual)
}

async function scrapeComputrabajo() {
    // ... (El código para Computrabajo permanece igual)
}

async function scrapeGoogleJobs() {
    console.log("Iniciando scraping de Google Jobs...");
    try {
        const url = 'https://www.google.com/search?q=program+manager+remote+mexico&ibp=htl;jobs';
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
            }
        });
        const $ = cheerio.load(data);
        const jobs = [];

        $('li.iFjolb').each((i, el) => {
            if (jobs.length >= 10) return;

            const title = $(el).find('div.PUpOsf').text().trim();
            const company = $(el).find('div.vNEEBe').text().trim();
            const jobUrl = $(el).find('a').attr('href');

            if (title && company && jobUrl) {
                jobs.push({
                    title,
                    company,
                    url: `https://www.google.com${jobUrl}`,
                    recruiter_name: null,
                    recruiter_email: null,
                    message: `Dear Hiring Team at ${company},\n\nI am writing to express my keen interest in the ${title} position I found listed on Google Jobs. As a Strategic Program Manager with over 10 years of experience in global cloud and Agile initiatives, my background in leading complex migrations to AWS and GCP aligns perfectly with this role's requirements.\n\nI have a proven track record of coordinating cross-functional teams across LATAM, India, and the U.S., enhancing CI/CD automation, and improving cloud governance. My certifications as an AWS Solutions Architect and Scrum Master further solidify my technical and methodological expertise.\n\nI am confident that my skills can bring significant value to your team. Thank you for your time and consideration.\n\nBest regards,\nJuan Manuel Ramírez Sosa`
                });
            }
        });
        console.log(`Scraping de Google Jobs finalizado. Se encontraron ${jobs.length} vacantes.`);
        return jobs;
    } catch (error) {
        console.error("Error en scraping de Google Jobs:", error.message);
        return [];
    }
}

// --- Lógica Principal del Handler (Actualizada) ---

module.exports = async (req, res) => {
    const { platform } = req.query;
    // ...

    try {
        // ... (lógica de caché igual)

        console.log('Caché no encontrado o expirado. Realizando scraping en vivo...');
        
        // Reemplazamos la llamada a LinkedIn con Google Jobs
        const [occ, computrabajo, google] = await Promise.all([
            scrapeOCC(),
            scrapeComputrabajo(),
            scrapeGoogleJobs()
        ]);
        
        const allJobs = { occ, computrabajo, google }; // Cambiamos 'linkedin' por 'google'

        await writeCache(allJobs);
        
        if (allJobs[platform]) {
            return res.status(200).json(allJobs[platform]);
        } // ...

    } catch (error) {
        // ... (manejo de errores igual)
    }
};

// --- Funciones de Caché (sin cambios) ---
// ...

