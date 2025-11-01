export const fetchDuties = async () => {
  try {
    const response = await fetch('https://final-hksamms.onrender.com/api/duties');
    const data = await response.json();
    return Array.isArray(data) ? data : [data]; // Ensure it's an array
  } catch (error) {
    console.error('Error fetching duties:', error);
    return [];
  }
};
