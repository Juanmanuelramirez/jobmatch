import allJobs from './jobs.json' with { type: 'json' };

export default async function handler(request, response) {
  const { platform } = request.query;

  try {
    // Verificación de robustez: Revisa si el archivo importado está vacío, lo que indica un fallo en el scraping.
    if (Object.keys(allJobs).length === 0 || !allJobs.linkedin) {
      console.error('jobs.json está vacío o malformado. El script de scraping probablemente falló.');
      return response.status(500).json({ 
        error: 'No se encontraron datos de vacantes. El proceso de scraping falló durante el despliegue. Revisa los logs del build en Vercel para más detalles.' 
      });
    }

    if (!platform || !allJobs[platform]) {
      return response.status(400).json({ error: 'Plataforma no válida o no especificada.' });
    }
    
    const platformJobs = allJobs[platform];
    
    response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return response.status(200).json(platformJobs);

  } catch (error) {
    console.error('Error al procesar el archivo jobs.json importado:', error);
    return response.status(500).json({ 
      error: 'No se pudieron procesar los datos de las vacantes.' 
    });
  }
}
