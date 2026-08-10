export interface Court {
  id: string
  name: string
  city: string
  address: string
}

export const CITIES: string[] = ['Chișinău', 'Cherkasy']

export const COURTS: Court[] = [
  {
    id: 'ipadel-academia',
    name: 'Academia iPadel Moldova',
    city: 'Chișinău',
    address: 'Strada Ghidighici 1 (La Izvor Park), Chișinău',
  },
  {
    id: 'kangaroo-squash-padel',
    name: 'Kangaroo Squash & Padel',
    city: 'Chișinău',
    address: 'Strada Gheorghe Asachi 23a, Chișinău',
  },
  {
    id: 'squash-padel-city',
    name: 'Squash & Padel City',
    city: 'Chișinău',
    address: 'Strada Pantelimon Halippa 3, MD-2009, Chișinău',
  },
  {
    id: 'ursu-padel',
    name: 'Ursu Padel',
    city: 'Chișinău',
    address: 'Strada Viilor 232, Zarea, Chișinău',
  },
  {
    id: 'lemon-tree-padel',
    name: 'Lemon Tree Padel',
    city: 'Chișinău',
    address: 'Calea Moșilor 18, Chișinău',
  },
  {
    id: 'cherkasy-padel-club',
    name: 'Padel Club Cherkasy',
    city: 'Cherkasy',
    address: 'вулиця Князя Ольгерда 5, Черкаси',
  },
]

export function courtsInCity(city: string): Court[] {
  return COURTS.filter((c) => c.city === city)
}

export function courtLabel(id: string | undefined): string {
  return COURTS.find((c) => c.id === id)?.name ?? ''
}

export function courtAddress(id: string | undefined): string {
  return COURTS.find((c) => c.id === id)?.address ?? ''
}
