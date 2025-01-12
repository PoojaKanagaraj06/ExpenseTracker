const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggleBtn');
const indicator = document.getElementById('indicator');
const menuItems = document.querySelectorAll('.sidebar ul li');

// Toggle sidebar open/close
toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    // Adjust button icon based on sidebar state
    if (sidebar.classList.contains('open')) {
        toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    } else {
        toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    }
});

// Move the indicator line on hover
menuItems.forEach((item, index) => {
    item.addEventListener('mouseover', () => {
        const itemHeight = item.offsetHeight;
        const offsetTop = item.offsetTop;
        indicator.style.top = `${offsetTop}px`;
        indicator.style.height = `${itemHeight}px`; // Match the height of the current item
    });
});

