import { Country, City } from "country-state-city";

export function getRandomRegion(): string {
  try {
    const countries = Country.getAllCountries();
    if (countries.length === 0) return "Toronto, Canada";
    const country = countries[Math.floor(Math.random() * countries.length)];
    const cities = City.getCitiesOfCountry(country.isoCode);
    if (!cities || cities.length === 0) return getRandomRegion();
    const city = cities[Math.floor(Math.random() * cities.length)];
    return `${city.name}, ${country.name}`;
  } catch {
    // If anything goes wrong, try again
    return getRandomRegion();
  }
}
