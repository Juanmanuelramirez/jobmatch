document.addEventListener('DOMContentLoaded', () => {
    const jobListingsContainer = document.getElementById('job-listings');
    const tabs = document.querySelectorAll('.tab-button');
    const modal = document.getElementById('message-modal');
    const closeModal = document.querySelector('.close-button');
    const modalJobTitle = document.getElementById('modal-job-title');
    const modalMessage = document.getElementById('modal-message');
    const copyButton = document.getElementById('copy-button');

    let currentJobs = [];

    const fetchJobs = async (platform = 'linkedin') => {
        showLoader();
        try {
            const response = await fetch(`/api/jobs?platform=${platform}`);
            
            // Si la respuesta no es OK, intenta leer el error como JSON.
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'El servidor devolvió una respuesta inesperada.' }));
                throw new Error(errorData.error);
            }
            
            const jobs = await response.json();
            currentJobs = jobs;
            displayJobs(jobs);

        } catch (error) {
            // Maneja el error, ya sea de la red o del JSON parseado
            displayError(`Error al cargar vacantes: ${error.message}`);
            console.error('Error al obtener las vacantes:', error);
        }
    };

    const displayJobs = (jobs) => {
        jobListingsContainer.innerHTML = '';
        if (!jobs || jobs.length === 0) {
            displayError('No se encontraron vacantes para esta plataforma.');
            return;
        }

        jobs.forEach((job, index) => {
            const card = document.createElement('div');
            card.className = 'job-card';
            card.innerHTML = `
                <div class="job-header">
                    <h3>${job.title}</h3>
                    ${job.match ? `<div class="match-score" title="Compatibilidad con tu CV">${job.match}%</div>` : ''}
                </div>
                <p class="company">${job.company}</p>
                <p class="recruiter">
                    Reclutador: <span class="not-found">${job.recruiter_name || 'No encontrado'}</span>
                </p>
                <div class="actions">
                    <a href="${job.url}" target="_blank" class="apply-link">Ver Vacante</a>
                    <button class="message-button" data-index="${index}" ${!job.message ? 'disabled' : ''}>Generar Mensaje</button>
                </div>
            `;
            jobListingsContainer.appendChild(card);
        });
    };
    
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `
        .job-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .match-score { background-color: #007bff; color: white; padding: 5px 10px; border-radius: 15px; font-size: 0.9em; font-weight: bold; flex-shrink: 0; margin-left: 10px; }
    `;
    document.head.appendChild(styleSheet);

    const showLoader = () => {
        jobListingsContainer.innerHTML = '<div class="loader"></div>';
    };

    const displayError = (message) => {
        jobListingsContainer.innerHTML = `<p style="text-align: center; color: #d9534f; background-color: #f8d7da; padding: 10px; border-radius: 5px; border: 1px solid #f5c6cb;">${message}</p>`;
    };
    
    const openMessageModal = (job) => {
        modalJobTitle.textContent = `Para: ${job.title} en ${job.company}`;
        modalMessage.value = job.message;
        modal.style.display = 'block';
    };

    const copyMessageToClipboard = () => {
        modalMessage.select();
        modalMessage.setSelectionRange(0, 99999);
        try {
            document.execCommand('copy');
            copyButton.textContent = '¡Copiado!';
        } catch (err) {
            copyButton.textContent = 'Error';
        } finally {
            setTimeout(() => { copyButton.textContent = 'Copiar Mensaje'; }, 2000);
        }
    };
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            fetchJobs(tab.dataset.platform);
        });
    });

    jobListingsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('message-button')) {
            const index = event.target.dataset.index;
            const job = currentJobs[index];
            if (job) {
                openMessageModal(job);
            }
        }
    });

    closeModal.addEventListener('click', () => { modal.style.display = 'none'; });
    window.addEventListener('click', (event) => { if (event.target == modal) { modal.style.display = 'none'; }});
    copyButton.addEventListener('click', copyMessageToClipboard);

    fetchJobs();
});

