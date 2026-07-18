/**
 * Đường dẫn ảnh local trong /public/images
 * Bỏ file vào đúng thư mục + tên file — xem public/images/README.md
 */
export const IMAGES = {
  backgrounds: {
    hero: "/images/backgrounds/hero.jpg",
    about: "/images/backgrounds/about.jpg",
    dealerCta: "/images/backgrounds/dealer-cta.jpg",
  },
  products: {
    product1: "/images/products/featured/product-1.jpg",
    product2: "/images/products/featured/product-2.jpg",
    product3: "/images/products/featured/product-3.jpg",
    product4: "/images/products/featured/product-4.jpg",
  },
  news: {
    news1: "/images/news/news-1.jpg",
    news2: "/images/news/news-2.jpg",
    news3: "/images/news/news-3.jpg",
  },
  testimonials: {
    customer1: "/images/testimonials/customer-1.jpg",
    customer2: "/images/testimonials/customer-2.jpg",
    customer3: "/images/testimonials/customer-3.jpg",
    customer4: "/images/testimonials/customer-4.jpg",
    customer5: "/images/testimonials/customer-5.jpg",
    customer6: "/images/testimonials/customer-1.jpg",
  },
  brand: {
    logo: "/images/brand/logo.png",
    logoWhite: "/images/brand/logo-white.png",
  },
  social: {
    facebook: "/images/social/facebook.png",
    zalo: "/images/social/zalo.png",
  },
} as const;
