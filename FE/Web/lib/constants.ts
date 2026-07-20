import type { LucideIcon } from "lucide-react";
import {
  Beaker,
  Cpu,
  Factory,
  FlaskConical,
  Handshake,
  Headphones,
  Headset,
  Package,
  Search,
  ShieldCheck,
  Sprout,
  Truck,
  Users,
} from "lucide-react";
import { IMAGES } from "@/lib/images";

export const COMPANY = {
  name: "Công ty TNHH ASAKA - JAPAN",
  shortName: "ASAKA - JAPAN",
  url: "https://asaka-japan.com",
  phone: "0946866068",
  email: "info@asaka-japan.com",
  address: "1155/35 tỉnh lộ 43, KP 11, phường Tam Bình, TP.HCM",
  mapQuery: "10.8860419,106.7259492",
  mapUrl:
    "https://www.google.com/maps/search/?api=1&query=10.8860419,106.7259492",
  mapEmbedUrl:
    "https://maps.google.com/maps?q=10.8860419,106.7259492&z=17&output=embed",
  facebook: "https://www.facebook.com/profile.php?id=61581303805805",
  zalo: "https://zalo.me/0946866068",
} as const;

export const NAV_LINKS = [
  { label: "Giới thiệu", href: "#about" },
  { label: "Sản phẩm", href: "/products" },
  { label: "Quy trình", href: "#process" },
  { label: "Đại lý", href: "#dealer" },
  { label: "Tin tức", href: "#news" },
  { label: "Liên hệ", href: "#contact" },
] as const;

export const HERO_STATS = [
  { value: 10, suffix: "+", label: "Năm kinh nghiệm" },
  { value: 150, suffix: "+", label: "Sản phẩm" },
  { value: 100, suffix: "+", label: "Đại lý toàn quốc" },
  { value: 63, suffix: "", label: "Tỉnh thành phủ sóng" },
] as const;

export const COMPANY_STATS = [
  { value: 10, suffix: "+", label: "Năm kinh nghiệm" },
  { value: 150, suffix: "+", label: "Danh mục sản phẩm" },
  { value: 100, suffix: "+", label: "Đại lý" },
  { value: 63, suffix: "", label: "Tỉnh thành" },
  { value: 10000, suffix: "+", label: "Khách hàng phục vụ" },
] as const;

export type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const WHY_CHOOSE: Feature[] = [
  {
    icon: ShieldCheck,
    title: "Sản phẩm chất lượng",
    description:
      "Cung cấp các sản phẩm thuốc bảo vệ thực vật và phân bón được lựa chọn từ những đối tác uy tín, đáp ứng nhu cầu sản xuất nông nghiệp hiện đại.",
  },
  {
    icon: Handshake,
    title: "Hợp tác bền vững",
    description:
      "Xây dựng mối quan hệ lâu dài với hệ thống đại lý và đối tác thông qua chính sách hợp tác minh bạch và dịch vụ chuyên nghiệp.",
  },
  {
    icon: Truck,
    title: "Phân phối linh hoạt",
    description:
      "Đáp ứng nhanh nhu cầu của khách hàng với quy trình cung ứng linh hoạt, hỗ trợ giao hàng đến nhiều khu vực trên toàn quốc.",
  },
  {
    icon: Users,
    title: "Đồng hành cùng khách hàng",
    description:
      "Luôn lắng nghe, tư vấn và hỗ trợ lựa chọn giải pháp phù hợp nhằm nâng cao hiệu quả sử dụng và phát triển bền vững.",
  },
];

export type Product = {
  name: string;
  category: string;
  benefit: string;
  image: string;
  alt: string;
};

export const FEATURED_PRODUCTS: Product[] = [
  {
    name: "Fertilizer Soil Conditioner",
    category: "Phân bón",
    benefit: "Giải pháp dinh dưỡng và cải tạo đất phục vụ sản xuất nông nghiệp.",
    image: IMAGES.products.product1,
    alt: "Sản phẩm phân bón và cải tạo đất",
  },
  {
    name: "Eco Green Natural Humic",
    category: "Dinh dưỡng hữu cơ",
    benefit: "Sản phẩm humic hỗ trợ bổ sung hữu cơ và chăm sóc đất canh tác.",
    image: IMAGES.products.product2,
    alt: "Sản phẩm Eco Green Natural Humic",
  },
  {
    name: "Imperial NPK+",
    category: "Phân bón lá",
    benefit: "Giải pháp NPK dạng lỏng dùng trong chương trình dinh dưỡng cây trồng.",
    image: IMAGES.products.product3,
    alt: "Sản phẩm Imperial NPK Plus",
  },
  {
    name: "Humax-98",
    category: "Cải tạo đất",
    benefit: "Sản phẩm hỗ trợ cải thiện môi trường đất và vùng rễ cây trồng.",
    image: IMAGES.products.product4,
    alt: "Sản phẩm Humax-98",
  },
  {
    name: "Dinh dưỡng đất chuyên dụng",
    category: "Dinh dưỡng đất",
    benefit: "Giải pháp bổ sung dinh dưỡng phù hợp với nhiều mô hình canh tác.",
    image: IMAGES.products.product1,
    alt: "Dòng sản phẩm dinh dưỡng đất chuyên dụng",
  },
  {
    name: "Humic hữu cơ",
    category: "Hữu cơ",
    benefit: "Dòng sản phẩm hữu cơ hỗ trợ chăm sóc đất và cây trồng.",
    image: IMAGES.products.product2,
    alt: "Dòng sản phẩm humic hữu cơ",
  },
  {
    name: "NPK qua lá",
    category: "Phân bón lá",
    benefit: "Giải pháp dinh dưỡng qua lá linh hoạt cho từng giai đoạn sinh trưởng.",
    image: IMAGES.products.product3,
    alt: "Dòng sản phẩm NPK sử dụng qua lá",
  },
  {
    name: "Giải pháp chăm sóc vùng rễ",
    category: "Chăm sóc rễ",
    benefit: "Dòng sản phẩm hỗ trợ môi trường vùng rễ trong quá trình canh tác.",
    image: IMAGES.products.product4,
    alt: "Dòng sản phẩm chăm sóc vùng rễ",
  },
];

export type ProcessStep = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const MANUFACTURING_STEPS: ProcessStep[] = [
  {
    icon: Search,
    title: "Lựa chọn sản phẩm",
    description:
      "ASAKA JAPAN hợp tác cùng các nhà sản xuất uy tín để lựa chọn những sản phẩm phù hợp với nhu cầu của thị trường và điều kiện canh tác tại Việt Nam.",
  },
  {
    icon: ShieldCheck,
    title: "Kiểm soát chất lượng",
    description:
      "Mỗi sản phẩm được kiểm tra thông tin, nguồn gốc và tiêu chuẩn trước khi phân phối đến hệ thống đại lý và khách hàng.",
  },
  {
    icon: Package,
    title: "Đóng gói & bảo quản",
    description:
      "Sản phẩm được bảo quản và đóng gói đúng quy cách nhằm đảm bảo chất lượng trong suốt quá trình lưu thông.",
  },
  {
    icon: Truck,
    title: "Phân phối",
    description:
      "Đáp ứng nhu cầu của khách hàng thông qua quy trình cung ứng linh hoạt và giao hàng đúng tiến độ.",
  },
  {
    icon: Headset,
    title: "Hỗ trợ sau bán hàng",
    description:
      "Đồng hành cùng đại lý và khách hàng trong quá trình sử dụng sản phẩm, tư vấn và hỗ trợ khi cần thiết.",
  },
];

export type Testimonial = {
  quote: string;
  author: string;
  role: string;
  type: "dealer" | "farmer";
  image: string;
  alt: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Chúng tôi đánh giá cao chất lượng sản phẩm và sự hỗ trợ chuyên nghiệp trong quá trình hợp tác.",
    author: "Đại lý khu vực miền Tây",
    role: "Đối tác phân phối",
    type: "dealer",
    image: IMAGES.testimonials.customer1,
    alt: "Đại lý phân phối",
  },
  {
    quote:
      "Sản phẩm đáp ứng tốt nhu cầu canh tác và được đội ngũ tư vấn hỗ trợ kịp thời khi cần thiết.",
    author: "Khách hàng miền Trung",
    role: "Khách hàng",
    type: "farmer",
    image: IMAGES.testimonials.customer2,
    alt: "Khách hàng sử dụng sản phẩm",
  },
  {
    quote:
      "Quy trình làm việc rõ ràng và chính sách hợp tác minh bạch giúp chúng tôi yên tâm khi đồng hành lâu dài.",
    author: "Đối tác kinh doanh",
    role: "Đại lý phân phối",
    type: "dealer",
    image: IMAGES.testimonials.customer3,
    alt: "Đối tác kinh doanh",
  },
  {
    quote:
      "Hàng hóa ổn định, giao hàng đúng tiến độ và đội ngũ luôn sẵn sàng hỗ trợ khi chúng tôi cần.",
    author: "Đại lý khu vực Đông Nam Bộ",
    role: "Đại lý cấp 1",
    type: "dealer",
    image: IMAGES.testimonials.customer4,
    alt: "Đại lý khu vực Đông Nam Bộ",
  },
  {
    quote:
      "Sau khi sử dụng sản phẩm, cây trồng phát triển tốt hơn và chúng tôi nhận được tư vấn dễ hiểu, sát thực tế.",
    author: "Nông hộ ĐBSCL",
    role: "Nông dân",
    type: "farmer",
    image: IMAGES.testimonials.customer5,
    alt: "Nông hộ Đồng bằng sông Cửu Long",
  },
  {
    quote:
      "ASAKA JAPAN đồng hành tận tâm, sản phẩm phù hợp với nhu cầu thị trường và hỗ trợ đại lý rất chu đáo.",
    author: "Nhà phân phối miền Bắc",
    role: "Nhà phân phối",
    type: "dealer",
    image: IMAGES.testimonials.customer6,
    alt: "Nhà phân phối miền Bắc",
  },
];

export type NewsArticle = {
  title: string;
  excerpt: string;
  date: string;
  image: string;
  alt: string;
};

export const NEWS_ARTICLES: NewsArticle[] = [
  {
    title: "Đồng Phát ra mắt dòng thuốc trừ sâu thế hệ mới",
    excerpt:
      "Công thức tiên tiến, hiệu quả cao, an toàn cho môi trường — giải pháp tối ưu cho vụ mùa 2026.",
    date: "12/07/2026",
    image: IMAGES.news.news1,
    alt: "Cánh đồng nông nghiệp",
  },
  {
    title: "Hội thảo kỹ thuật canh tác bền vững tại ĐBSCL",
    excerpt:
      "Hơn 500 nông dân và đại lý tham dự, chia sẻ kinh nghiệm ứng dụng công nghệ bảo vệ thực vật hiện đại.",
    date: "28/06/2026",
    image: IMAGES.news.news2,
    alt: "Hội thảo nông nghiệp",
  },
  {
    title: "ASAKA JAPAN hướng đến giải pháp nông nghiệp bền vững",
    excerpt:
      "Doanh nghiệp tập trung cung cấp sản phẩm chất lượng, dịch vụ chuyên nghiệp và đồng hành cùng khách hàng trong sản xuất nông nghiệp.",
    date: "15/06/2026",
    image: IMAGES.news.news3,
    alt: "Môi trường xanh",
  },
];

export const PARTNER_LOGOS = [
  "Syngenta Partner",
  "BASF Network",
  "AgriTech VN",
  "FarmConnect",
  "GreenField Co.",
  "CropScience Alliance",
] as const;

export const CORE_VALUES = [
  {
    icon: ShieldCheck,
    label: "Chất lượng",
  },
  {
    icon: Handshake,
    label: "Uy tín",
  },
  {
    icon: Sprout,
    label: "Đổi mới",
  },
  {
    icon: Users,
    label: "Đồng hành",
  },
];

export const ABOUT_CONTENT = {
  overview:
    "CÔNG TY TNHH ASAKA JAPAN được thành lập từ năm 2018, hoạt động trong lĩnh vực phân phối thuốc bảo vệ thực vật, phân bón và các giải pháp nông nghiệp. Chúng tôi hợp tác với các nhà sản xuất uy tín nhằm mang đến những sản phẩm chất lượng, an toàn và hiệu quả cho hệ thống đại lý và bà con nông dân trên toàn quốc.",

  missionVision:
    "ASAKA JAPAN hướng đến trở thành đối tác tin cậy của ngành nông nghiệp Việt Nam thông qua việc cung cấp các giải pháp bảo vệ cây trồng chất lượng, dịch vụ chuyên nghiệp và mạng lưới phân phối bền vững, góp phần nâng cao hiệu quả sản xuất cho khách hàng và đối tác.",
};

export const FOOTER_LINKS = {
  company: [
    { label: "Giới thiệu", href: "#about" },
    { label: "Sản phẩm", href: "/products" },
    { label: "Quy trình", href: "#process" },
    { label: "Tại sao chọn chúng tôi", href: "#why-choose" },
  ],
  support: [
    { label: "Trở thành đại lý", href: "#dealer" },
    { label: "Tin tức", href: "#news" },
    { label: "Liên hệ", href: "#contact" },
  ],
} as const;
