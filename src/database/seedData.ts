import { Product, Device, Controller, Game } from '../types';

export const seedData = {
  products: [
    { 
      name: 'Coca Cola', 
      price: 2.50, 
      cost: 1.20,
      category: 'drinks' as const, 
      image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=150',
      stock: 24,
      barcode: 'PS-DRINK-001'
    },
    { 
      name: 'Doritos', 
      price: 3.00, 
      cost: 1.50,
      category: 'snacks' as const, 
      image: 'https://images.unsplash.com/photo-1600952841320-db92ec4047ca?w=150',
      stock: 15,
      barcode: 'PS-SNACK-001'
    },
    { 
      name: 'M&Ms', 
      price: 2.00, 
      cost: 1.00,
      category: 'sweets' as const, 
      image: 'https://images.unsplash.com/photo-1581798459219-318e76aecc7b?w=150',
      stock: 30,
      barcode: 'PS-SWEET-001'
    }
  ] as Omit<Product, 'id'>[],

  devices: [
    {
      name: 'PS5-01',
      type: 'PS5' as const,
      status: 'available' as const,
      location: 'Station 1',
      pricePerMinute: 0.3
    },
    {
      name: 'PS5-02',
      type: 'PS5' as const,
      status: 'available' as const,
      location: 'Station 2',
      pricePerMinute: 0.3
    },
    {
      name: 'PS4-01',
      type: 'PS4' as const,
      status: 'available' as const,
      location: 'Station 3',
      pricePerMinute: 0.2
    },
    {
      name: 'Xbox-01',
      type: 'Xbox Series X' as const,
      status: 'available' as const,
      location: 'Station 4',
      pricePerMinute: 0.3
    }
  ] as Omit<Device, 'id'>[],

  controllers: [
    {
      name: 'PS5 Controller White',
      type: 'PS5' as const,
      status: 'available' as const,
      pricePerMinute: 0.1,
      color: 'White'
    },
    {
      name: 'PS5 Controller Black',
      type: 'PS5' as const,
      status: 'available' as const,
      pricePerMinute: 0.1,
      color: 'Black'
    },
    {
      name: 'PS4 Controller',
      type: 'PS4' as const,
      status: 'available' as const,
      pricePerMinute: 0.08,
      color: 'Black'
    },
    {
      name: 'Xbox Controller',
      type: 'Xbox Series X' as const,
      status: 'available' as const,
      pricePerMinute: 0.1,
      color: 'Black'
    }
  ] as Omit<Controller, 'id'>[],

  games: [
    {
      name: 'God of War Ragnarök',
      pricePerMinute: 0.5,
      image: 'https://images.unsplash.com/photo-1616249807402-9dae436108cf?w=150',
      deviceTypes: ['PS5', 'PS4'],
      isMultiplayer: false
    },
    {
      name: 'Spider-Man 2',
      pricePerMinute: 0.6,
      image: 'https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?w=150',
      deviceTypes: ['PS5'],
      isMultiplayer: false
    },
    {
      name: 'FIFA 24',
      pricePerMinute: 0.4,
      image: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=150',
      deviceTypes: ['PS5', 'PS4', 'Xbox Series X', 'Xbox One'],
      isMultiplayer: true
    },
    {
      name: 'Mario Kart 8 Deluxe',
      pricePerMinute: 0.3,
      image: 'https://images.unsplash.com/photo-1612404819070-77c6da472e68?w=150',
      deviceTypes: ['Nintendo Switch'],
      isMultiplayer: true
    }
  ] as Omit<Game, 'id'>[]
};