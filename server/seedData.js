export const seedData = {
  products: [
    { 
      name: 'Coca Cola', 
      price: 2.50, 
      cost: 1.20,
      category: 'drinks', 
      image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=150',
      stock: 24,
      barcode: 'PS-DRINK-001'
    },
    { 
      name: 'Doritos', 
      price: 3.00, 
      cost: 1.50,
      category: 'snacks', 
      image: 'https://images.unsplash.com/photo-1600952841320-db92ec4047ca?w=150',
      stock: 15,
      barcode: 'PS-SNACK-001'
    },
    { 
      name: 'M&Ms', 
      price: 2.00, 
      cost: 1.00,
      category: 'sweets', 
      image: 'https://images.unsplash.com/photo-1581798459219-318e76aecc7b?w=150',
      stock: 30,
      barcode: 'PS-SWEET-001'
    }
  ],

  stations: [
    {
      name: 'PS5-01',
      type: 'PS5',
      status: 'available',
      location: 'Station 1',
      price_per_minute: 0.3
    },
    {
      name: 'PS5-02',
      type: 'PS5',
      status: 'available',
      location: 'Station 2',
      price_per_minute: 0.3
    },
    {
      name: 'PS4-01',
      type: 'PS4',
      status: 'available',
      location: 'Station 3',
      price_per_minute: 0.2
    },
    {
      name: 'Xbox-01',
      type: 'Xbox Series X',
      status: 'available',
      location: 'Station 4',
      price_per_minute: 0.3
    }
  ],

  controllers: [
    {
      name: 'PS5 Controller White',
      type: 'PS5',
      status: 'available',
      price_per_minute: 0.1,
      color: 'White',
      identifier: 'CTRL-PS5-WHITE-001',
      last_maintenance: '2024-12-15'
    },
    {
      name: 'PS5 Controller Black',
      type: 'PS5',
      status: 'available',
      price_per_minute: 0.1,
      color: 'Black',
      identifier: 'CTRL-PS5-BLACK-001',
      last_maintenance: '2024-12-10'
    },
    {
      name: 'PS4 Controller',
      type: 'PS4',
      status: 'available',
      price_per_minute: 0.08,
      color: 'Black',
      identifier: 'CTRL-PS4-BLACK-001',
      last_maintenance: '2024-11-20'
    },
    {
      name: 'Xbox Controller',
      type: 'Xbox Series X',
      status: 'available',
      price_per_minute: 0.1,
      color: 'Black',
      identifier: 'CTRL-XBOX-BLACK-001',
      last_maintenance: '2024-12-01'
    }
  ],

  games: [
    {
      name: 'God of War Ragnarök',
      price_per_minute: 0.5,
      image: 'https://images.unsplash.com/photo-1616249807402-9dae436108cf?w=150',
      device_types: ['PS5', 'PS4'],
      is_multiplayer: false,
      is_active: true
    },
    {
      name: 'Spider-Man 2',
      price_per_minute: 0.6,
      image: 'https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?w=150',
      device_types: ['PS5'],
      is_multiplayer: false,
      is_active: true
    },
    {
      name: 'FIFA 24',
      price_per_minute: 0.4,
      image: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=150',
      device_types: ['PS5', 'PS4', 'Xbox Series X', 'Xbox One'],
      is_multiplayer: true
    },
    {
      name: 'Mario Kart 8 Deluxe',
      price_per_minute: 0.3,
      image: 'https://images.unsplash.com/photo-1612404819070-77c6da472e68?w=150',
      device_types: ['Nintendo Switch'],
      is_multiplayer: true,
      is_active: true
    }
  ]
};
