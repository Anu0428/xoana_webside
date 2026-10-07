export interface StoreProduct {
  demoOnly?: boolean;
  id: number;
  name: string;
  nameEn?: string;
  price: number;
  coverImage?: string;
  images?: string[];
  category?: string;
  stock: number;
  description?: string;
  descriptionEn?: string;
  material?: string;
  materialEn?: string;
  dimensions?: string;
}

const createTruck = (
  id: number,
  name: string,
  nameEn: string,
  price: number,
  image: string,
): StoreProduct => ({
  demoOnly: true,
  id,
  name,
  nameEn,
  price,
  coverImage: `/products/samples/${image}`,
  category: 'truck',
  stock: 20,
  material: '铝合金',
  materialEn: 'Aluminum alloy',
  dimensions: '34 mm',
  description: `${name}，采用轻量铝合金制作，兼顾灵活转向与稳定支撑，适合日常练习与进阶动作。`,
  descriptionEn: `${nameEn} is made from lightweight aluminum alloy for responsive turns and stable support, ideal for both daily practice and advanced tricks.`,
});

export const SAMPLE_PRODUCTS: StoreProduct[] = [
  createTruck(910001, 'XOANA 原色银桥', 'XOANA Raw Silver Truck', 129, 'truck-01-raw-silver.jpg'),
  createTruck(910002, 'XOANA 镜面银桥', 'XOANA Polished Silver Truck', 139, 'truck-02-polished-silver.jpg'),
  createTruck(910003, 'XOANA 黑底原色银桥', 'XOANA Raw Silver / Black Truck', 139, 'truck-03-black-base.jpg'),
  createTruck(910004, 'XOANA 紫底镜面银桥', 'XOANA Chrome / Purple Truck', 149, 'truck-04-purple-chrome.jpg'),
  createTruck(910005, 'XOANA 淡紫底原色银桥', 'XOANA Raw Silver / Lavender Truck', 139, 'truck-05-lavender-raw.jpg'),
  createTruck(910006, 'XOANA 金底原色银桥', 'XOANA Raw Silver / Gold Truck', 149, 'truck-06-gold-raw.jpg'),
  createTruck(910007, 'XOANA 粉底镜面银桥', 'XOANA Chrome / Pink Truck', 149, 'truck-07-pink-chrome.jpg'),
  createTruck(910008, 'XOANA 金底镜面银桥', 'XOANA Chrome / Gold Truck', 159, 'truck-08-gold-chrome.jpg'),
  createTruck(910009, 'XOANA 黑底镜面银桥', 'XOANA Chrome / Black Truck', 149, 'truck-09-black-chrome.jpg'),
  createTruck(910010, 'XOANA 薄荷绿底原色银桥', 'XOANA Raw Silver / Mint Truck', 139, 'truck-10-mint-raw.jpg'),
  createTruck(910011, 'XOANA 蓝底镜面银桥', 'XOANA Chrome / Blue Truck', 149, 'truck-11-blue-chrome.jpg'),
  createTruck(910012, 'XOANA 金底原色专业桥', 'XOANA Raw Silver / Gold Pro Truck', 169, 'truck-12-gold-pro.jpg'),
  createTruck(910013, 'XOANA 粉底原色银桥', 'XOANA Raw Silver / Pink Truck', 139, 'truck-13-pink-raw.jpg'),
  createTruck(910014, 'XOANA 薄荷绿底镜面银桥', 'XOANA Chrome / Mint Truck', 149, 'truck-14-mint-chrome.jpg'),
  createTruck(910015, 'XOANA 红底镜面银桥', 'XOANA Chrome / Red Truck', 149, 'truck-15-red-chrome.jpg'),
  createTruck(910016, 'XOANA 紫底原色银桥', 'XOANA Raw Silver / Purple Truck', 139, 'truck-16-purple-raw.jpg'),
  createTruck(910017, 'XOANA 紫底镜面专业桥', 'XOANA Chrome / Purple Pro Truck', 169, 'truck-17-purple-pro.jpg'),
  createTruck(910018, 'XOANA 红底原色银桥', 'XOANA Raw Silver / Red Truck', 139, 'truck-18-red-raw.jpg'),
];

export const getSampleProductById = (id: number) =>
  SAMPLE_PRODUCTS.find((product) => product.id === id);
