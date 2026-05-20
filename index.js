  const categories = {
    work:{color: '#4CAF50', label: 'Work',class:"work"},
    recovery:{color: '#2196F3', label: 'Recovery',class:"recovery"},
    growth:{color: '#FFC107', label: 'Growth',class:"growth"},
    leisure:{color: '#9C27B0', label: 'Leisure',class:"leisure"},
    maintenance:{color: '#E91E63', label: 'Maintenance',class:"maintenance"},
    business:{color: '#FF5722', label: 'Business',class:"business"},
  };

    let currentDate = new Date();
    let currentYear = currentDate.getFullYear();
    let currentMonth = currentDate.getMonth();

    let dataStore = new Map();

    let activeFilter = null;

    //generate date key
    function getCellKey(dateStr,hourBlock) {
      return `${dateStr}-${hourBlock}`;
    }

    //get all days in a month
    function getDaysInMonth(currentYear,month){
      return new Date(currentYear, month + 1, 0).getDate();
    }

    //format date to YYYY-MM-DD
    function formatDate(year, month, day){
      return`${year}-${String(month + 1)}.padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
