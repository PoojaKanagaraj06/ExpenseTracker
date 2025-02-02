document.addEventListener('DOMContentLoaded', function () {
    const incomeCategoryPieChartCtx = document.getElementById('incomeCategoryPieChart').getContext('2d');
    const expenseCategoryPieChartCtx = document.getElementById('expenseCategoryPieChart').getContext('2d');

    let incomePieChartInstance = null;
    let expensePieChartInstance = null;

    // Fetch data for income categories
    async function fetchIncomeData() {
        try {
            const response = await fetch('/incomes');
            if (!response.ok) {
                throw new Error('Failed to fetch income data');
            }
            const data = await response.json();
            updatePieChart(data, incomeCategoryPieChartCtx, incomePieChartInstance, 'Income Category Distribution');
        } catch (error) {
            console.error('Error fetching income data:', error);
            alert('Failed to load income chart data. Please try again later.');
        }
    }

    // Fetch data for expense categories
    async function fetchExpenseData() {
        try {
            const response = await fetch('/expenses');
            if (!response.ok) {
                throw new Error('Failed to fetch expense data');
            }
            const data = await response.json();
            updatePieChart(data, expenseCategoryPieChartCtx, expensePieChartInstance, 'Expense Category Distribution');
        } catch (error) {
            console.error('Error fetching expense data:', error);
            alert('Failed to load expense chart data. Please try again later.');
        }
    }

    function updatePieChart(data, chartCtx, chartInstance, title) {
        const categories = [...new Set(data.map(item => item.category))];
        const categoryData = categories.map(category => {
            return data.filter(item => item.category === category).reduce((sum, item) => sum + item.amount, 0);
        });

        const pieChartConfig = {
            type: 'pie',
            data: {
                labels: categories,
                datasets: [{
                    data: categoryData,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)',
                        'rgba(54, 162, 235, 0.2)',
                        'rgba(255, 206, 86, 0.2)',
                        'rgba(75, 192, 192, 0.2)',
                        'rgba(153, 102, 255, 0.2)',
                        'rgba(255, 159, 64, 0.2)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: title
                    }
                }
            }
        };

        if (chartInstance) {
            chartInstance.destroy(); // Destroy the existing pie chart
        }
        chartInstance = new Chart(chartCtx, pieChartConfig); // Create a new pie chart
    }

    // Initialize the charts with example data
    fetchIncomeData();
    fetchExpenseData();
});