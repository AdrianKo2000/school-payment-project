// src/utils/constants.js

export const getNextWeekendStartDate = (previousEndDateStr) => {
  let date = new Date(previousEndDateStr);
  
  // Keep adding days until we find a Saturday (6) or Sunday (0)
  // Current logic: loops until it hits a weekend
  do {
    date.setDate(date.getDate() + 1);
  } while (date.getDay() !== 6 && date.getDay() !== 0);
  
  return date.toISOString().split("T")[0];
};


export const CLASS_CATALOGUE = [
  // Lower Levels
  { id: "beginner-1", name: "Beginner 1", category: "Lower Levels" },
  { id: "beginner-2", name: "Beginner 2", category: "Lower Levels" },
  { id: "pre-starter-1", name: "Pre Starter 1", category: "Lower Levels" },
  { id: "pre-starter-2", name: "Pre Starter 2", category: "Lower Levels" },
  
  // Mid Levels
  { id: "starters", name: "Starters", category: "Intermediate Levels" },
  { id: "movers", name: "Movers", category: "Intermediate Levels" },
  { id: "flyers", name: "Flyers", category: "Intermediate Levels" },
  
  // Upper Levels
  { id: "ket", name: "KET", category: "Advanced Levels" },
  { id: "pet", name: "PET", category: "Advanced Levels" }
];

export const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];