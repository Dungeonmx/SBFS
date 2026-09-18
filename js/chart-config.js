const ChartConfig = {
    _chart: null,

    createPieChart(canvasId, labels, data, colors) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        if (this._chart) {
            this._chart.destroy();
        }

        const ctx = canvas.getContext('2d');
        this._chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderColor: '#1b2838',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#8fa3ba',
                            padding: 12,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                                return `${label}: ${value} juegos (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });

        return this._chart;
    },

    destroy() {
        if (this._chart) {
            this._chart.destroy();
            this._chart = null;
        }
    },

    getColors(count) {
        const palette = [
            '#66c0f4', '#a4d007', '#f1c40f', '#e67e22',
            '#e74c3c', '#9b59b6', '#1abc9c', '#2ecc71',
            '#3498db', '#e91e63', '#00bcd4', '#ff9800'
        ];
        if (count <= palette.length) return palette.slice(0, count);
        const colors = [...palette];
        for (let i = palette.length; i < count; i++) {
            const hue = (i * 137.508) % 360;
            colors.push(`hsl(${hue}, 60%, 55%)`);
        }
        return colors;
    }
};
