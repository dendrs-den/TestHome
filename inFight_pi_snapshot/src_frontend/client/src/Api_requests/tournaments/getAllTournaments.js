const getAllTournaments = async () => {
  try {
    const response = await fetch(`/tournaments/getall`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();

    const mappedData = [];

    for (let tour of data) {
      mappedData.push({
        id: tour.id,
        title: tour.name || "",
        bust_value: tour.bust_value,
        skip_value: tour.skip_value,
        teams: tour.teams || [{ name: "", number: 0 }],
        disciplines: tour.disciplines || [{ name: "" }],
        stages: tour.stages || [{ name: "", battle: false }],
      });
    }
    return data !== null ? mappedData : [];
  } catch (err) {
    console.log("Failed to load tournaments", err);
    return [];
  }
};

export default getAllTournaments;
