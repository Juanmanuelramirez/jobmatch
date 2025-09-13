import path from 'path';
import fs from 'fs/promises';

export default async function handler(request, response) {
  const { platform } = request.query;

  // CAMBIO CLAVE: La API ahora busca el archivo en su propio directorio.
  // process.cwd() en una función de Vercel apunta a /var/task, y el archivo estará en /var/task/api/jobs.json
  const jsonPath = path.join(process.cwd(), 'api', 'jobs.json');

  try {
    const jsonData = await fs.readFile(jsonPath, 'utf-8');
    const allJobs = JSON.parse(jsonData);

    if (!platform || !allJobs[platform]) {
      return response.status(400).json({ error: 'Plataforma no válida o no especificada.' });
    }
    
    const platformJobs = allJobs[platform];
    
    response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return response.status(200).json(platformJobs);

  } catch (error) {
    console.error('Error al leer el archivo jobs.json:', error);
    return response.status(500).json({ 
      error: 'No se encontraron datos de vacantes. El proceso de scraping pudo haber fallado durante el despliegue.' 
    });
  }
}
