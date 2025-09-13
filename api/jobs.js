import allJobs from './jobs.json' assert { type: 'json' };

export default async function handler(request, response) {
  const { platform } = request.query;

  try {
    // Los datos ahora vienen del archivo importado, no de una lectura del sistema.
    if (!platform || !allJobs[platform]) {
      return response.status(400).json({ error: 'Plataforma no válida o no especificada.' });
    }
    
    const platformJobs = allJobs[platform];
    
    response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return response.status(200).json(platformJobs);

  } catch (error) {
    // Este error ahora solo ocurriría si el JSON está malformado.
    console.error('Error al procesar el archivo jobs.json importado:', error);
    return response.status(500).json({ 
      error: 'No se pudieron procesar los datos de las vacantes.' 
    });
  }
}
