document.addEventListener("DOMContentLoaded", () => {
    // Hook into the native menu logic
    const analyticsMenuItem = document.querySelector('.menu-item[data-section="analytics"]');
    if(analyticsMenuItem) {
        analyticsMenuItem.addEventListener('click', loadAnalyticsData);
    }
});

let analyticsChartInstance = null;

async function loadAnalyticsData() {
    document.getElementById('analytics-layout').style.display = 'none';
    document.getElementById('analytics-error').style.display = 'none';
    document.getElementById('analytics-loading').style.display = 'block';

    try {
        const response = await fetch('/get_analytics');
        const data = await response.json();

        if (response.ok) {
            if(data.total_tasks_all === 0) {
                showAnalyticsError("Not enough data yet. Start completing tasks!");
                return;
            }
            renderAnalytics(data);
        } else {
            showAnalyticsError(data.error || "Failed to load analytics.");
        }
    } catch (error) {
        console.error("Analytics Error:", error);
        showAnalyticsError("Could not connect to the server.");
    }
}

function showAnalyticsError(message) {
    document.getElementById('analytics-loading').style.display = 'none';
    document.getElementById('analytics-layout').style.display = 'none';
    
    const errorEl = document.getElementById('analytics-error');
    errorEl.style.display = 'block';
    errorEl.textContent = message;
}

function renderAnalytics(data) {
    document.getElementById('analytics-loading').style.display = 'none';
    document.getElementById('analytics-layout').style.display = 'block';

    const { graph_data, ai_analysis, extra_analytics } = data;

    // 1. Extra Analytics & Badge
    document.getElementById('stat-trend').textContent = extra_analytics.productivity_trend || '--';
    document.getElementById('stat-time').textContent = extra_analytics.most_productive_time_block || '--';
    document.getElementById('stat-ignored').textContent = extra_analytics.most_ignored_task_type || '--';
    
    setTimeout(() => {
        document.getElementById('stat-consistency-fill').style.width = (extra_analytics.completion_consistency_indicator || 0) + '%';
        // Add neon color based on mode/theme dynamically
        document.getElementById('stat-consistency-fill').style.background = '#3b82f6';
        document.getElementById('stat-consistency-fill').style.boxShadow = '0 0 10px #3b82f6';
    }, 100);
    
    const badgeEl = document.getElementById('weekly-badge-container');
    if (extra_analytics.weekly_score_badge) {
        badgeEl.style.display = 'inline-block';
        badgeEl.textContent = extra_analytics.weekly_score_badge + ' (' + extra_analytics.completion_consistency_indicator + '%)';
        
        // Reset styles nicely
        badgeEl.style.border = '1px solid currentColor';
        if (extra_analytics.weekly_score_badge === 'Elite') {
            badgeEl.style.background = 'rgba(16, 185, 129, 0.2)';
            badgeEl.style.color = '#34d399';
        } else if (extra_analytics.weekly_score_badge === 'Consistent') {
            badgeEl.style.background = 'rgba(59, 130, 246, 0.2)';
            badgeEl.style.color = '#60a5fa';
        } else if (extra_analytics.weekly_score_badge === 'Improving') {
            badgeEl.style.background = 'rgba(245, 158, 11, 0.2)';
            badgeEl.style.color = '#fbbf24';
        } else {
            badgeEl.style.background = 'rgba(239, 68, 68, 0.2)';
            badgeEl.style.color = '#f87171';
        }
    } else {
        badgeEl.style.display = 'none';
    }

    // 2. AI Insights
    document.getElementById('ai-insights-text').textContent = ai_analysis.insights || 'Analysis data missing from AI response.';
    document.getElementById('ai-best-time').textContent = ai_analysis.best_study_time || extra_analytics.most_productive_time_block || '--';
    document.getElementById('ai-consistency').textContent = ai_analysis.consistency_score || '--';

    // 3. Weakness List
    const weaknessList = document.getElementById('weakness-list');
    weaknessList.innerHTML = '';
    if (ai_analysis.weaknesses && ai_analysis.weaknesses.length > 0) {
        ai_analysis.weaknesses.forEach(w => {
            const li = document.createElement('li');
            li.textContent = w;
            weaknessList.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = "No major weaknesses detected! Keep it up.";
        weaknessList.appendChild(li);
    }

    // 4. Suggestions List
    const suggestionList = document.getElementById('suggestion-list');
    suggestionList.innerHTML = '';
    if (ai_analysis.suggestions && ai_analysis.suggestions.length > 0) {
        ai_analysis.suggestions.forEach(s => {
            const li = document.createElement('li');
            li.textContent = s;
            suggestionList.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = "Stay consistent with your current flow.";
        suggestionList.appendChild(li);
    }

    // 5. Render Graph
    if (graph_data && graph_data.length > 0) {
        renderGraph(graph_data);
    }
    
    // Add staggered fading animations
    const fadeIns = document.querySelectorAll('#section-analytics .fade-in');
    fadeIns.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.animation = `fadeInUp 0.6s ease forwards ${index * 0.15}s`;
    });
}

function renderGraph(graph_data) {
    const canvas = document.getElementById('analytics-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (analyticsChartInstance) {
        analyticsChartInstance.destroy();
    }

    const sortedData = [...graph_data].sort((a,b) => new Date(a.date) - new Date(b.date));
    
    const labels = sortedData.map(d => {
        const dt = new Date(d.date);
        return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); 
    });
    const dataPoints = sortedData.map(d => d.completion);

    // Dynamic glowing gradient based on theme check (hack via matching background)
    let isLightMode = document.body.classList.contains('light-mode');
    
    let gradient = ctx.createLinearGradient(0, 0, 0, canvas.parentElement.offsetHeight);
    if (!isLightMode) {
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)'); // Neon blue
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.01)'); 
    } else {
        gradient.addColorStop(0, 'rgba(37, 99, 235, 0.3)');
        gradient.addColorStop(1, 'rgba(37, 99, 235, 0.01)');
    }

    analyticsChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Completion %',
                data: dataPoints,
                borderColor: '#3b82f6',
                backgroundColor: gradient,
                borderWidth: 4,
                tension: 0.4, 
                pointBackgroundColor: isLightMode ? '#fff' : '#0f172a',
                pointBorderColor: '#60a5fa',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 8,
                pointHoverBackgroundColor: '#60a5fa',
                pointHoverBorderColor: '#fff',
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isLightMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(15, 23, 42, 0.9)',
                    titleColor: isLightMode ? '#0f172a' : '#e2e8f0',
                    bodyColor: isLightMode ? '#334155' : '#cbd5e1',
                    borderColor: isLightMode ? '#e2e8f0' : '#334155',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y + '% Completed';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: isLightMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(51, 65, 85, 0.5)',
                        drawBorder: false
                    },
                    ticks: {
                        color: isLightMode ? '#64748b' : '#94a3b8',
                        stepSize: 20,
                        callback: function(value) { return value + "%"; }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { 
                        color: isLightMode ? '#64748b' : '#94a3b8',
                        font: { size: 12 }
                    }
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeOutQuart'
            }
        }
    });
}
