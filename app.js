document.addEventListener('DOMContentLoaded', () => {
    const jobListingsContainer = document.getElementById('job-listings');
    const tabs = document.querySelectorAll('.tab-button');
    const modal = document.getElementById('modal');
    const closeModal = document.querySelector('.close-button');
    const modalTitle = document.getElementById('modal-title');
    const modalVacancy = document.getElementById('modal-vacancy');
    const modalMessage = document.getElementById('modal-message');
    const copyButton = document.getElementById('copy-button');
    const copyFeedback = document.getElementById('copy-feedback');

    let currentJobs = [];

    const fetchJobs = async (platform) => {
        jobListingsContainer.innerHTML = '<p class="loading">Buscando las mejores vacantes para ti, esto puede tardar un momento...</p>';
        try {
            const response = await fetch(`/api/jobs?platform=${platform}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error en la respuesta del servidor.');
            }
            const jobs = await response.json();
            currentJobs = jobs;
            displayJobs(jobs, platform);
        } catch (error) {
            console.error('Error fetching jobs:', error);
            jobListingsContainer.innerHTML = `<p class="error">Error al cargar vacantes: ${error.message}<br>Por favor, intenta de nuevo.</p>`;
        }
    };

    const displayJobs = (jobs, platform) => {
        jobListingsContainer.innerHTML = '';
        if (!jobs || jobs.length === 0) {
            jobListingsContainer.innerHTML = `<p class="loading">No se encontraron vacantes remotas para "Program Manager" en ${platform} en este momento.</p>`;
            return;
        }

        jobs.forEach((job, index) => {
            const card = document.createElement('div');
            card.className = 'job-card';
            card.innerHTML = `
                <h3>${job.title}</h3>
                <strong class="company">${job.company}</strong>
                <div class="actions">
                    <a href="${job.url}" target="_blank" rel="noopener noreferrer" class="apply-link">Ver Vacante</a>
                    <button class="message-button" data-index="${index}">Generar Mensaje</button>
                </div>
                <p class="recruiter">
                    Reclutador: <span class="${job.recruiter_name ? '' : 'not-found'}">${job.recruiter_name || 'No disponible'}</span> | 
                    Email: <span class="${job.recruiter_email ? '' : 'not-found'}">${job.recruiter_email || 'No disponible'}</span>
                </p>
            `;
            jobListingsContainer.appendChild(card);
        });
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            fetchJobs(tab.dataset.platform);
        });
    });
    
    jobListingsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('message-button')) {
            const index = e.target.dataset.index;
            const job = currentJobs[index];
            
            modalVacancy.textContent = `${job.title} en ${job.company}`;
            modalMessage.value = job.message;
            modal.style.display = 'block';
            copyFeedback.textContent = '';
        }
    });

    closeModal.onclick = () => {
        modal.style.display = 'none';
    };

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };

    copyButton.addEventListener('click', () => {
        modalMessage.select();
        document.execCommand('copy');
        copyFeedback.textContent = '¡Copiado!';
        setTimeout(() => {
            copyFeedback.textContent = '';
        }, 2000);
    });

    // Carga inicial
    fetchJobs('occ');
});
