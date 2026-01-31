exports.getLocalDateString = (date = new Date()) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

exports.getLocalDateTime = () => {
  return new Date().toLocaleString('en-US', { 
    timeZone: 'Asia/Colombo' 
  });
};