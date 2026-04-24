export const DISTRICTS = [
  "Mjini",
  "Magharibi A",
  "Magharibi B",
  "Kaskazini A",
  "Kaskazini B",
  "Kati",
  "Kusini"
] as const;

export type District = typeof DISTRICTS[number];

export const WARDS: Record<District, string[]> = {
  "Mjini": ["Mkele", "Malindi", "Shangani", "Kikwajuni", "Michenzani", "Mwanakwerekwe", "Kwahani", "Magomeni"],
  "Magharibi A": ["Bububu", "Kiwengwa", "Mtoni", "Mbweni", "Fuoni", "Kiembe Samaki", "Kinuni"],
  "Magharibi B": ["Dimani", "Kizimkazi", "Paje", "Bwejuu", "Jambiani", "Makunduchi"],
  "Kaskazini A": ["Nungwi", "Kendwa", "Matemwe", "Tumbatu", "Kijini", "Mkokotoni"],
  "Kaskazini B": ["Mahonda", "Kanyeni", "Kiombamvua", "Misufini", "Donge"],
  "Kati": ["Dunga", "Tunguu", "Chwaka", "Uroa", "Marumbi", "Bambi"],
  "Kusini": ["Unguja Ukuu", "Muyuni", "Kizimkazi Dimbani", "Bwejuu", "Paje"]
};
