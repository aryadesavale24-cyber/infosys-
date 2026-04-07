package com.inventra.inventory.config;

import com.inventra.inventory.model.*;
import com.inventra.inventory.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Seeds the database with realistic electronics inventory data on startup.
 * Idempotent — skips seeding if products already exist.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

        private final UserRepository userRepository;
        private final CategoryRepository categoryRepository;
        private final ProductRepository productRepository;
        private final PasswordEncoder passwordEncoder;
        private final ManagerCategoryAssignmentRepository managerCatRepo;

        @Override
        @Transactional
        public void run(String... args) {

                // ── 1. USERS (always ensure these exist) ─────────────────────────────
                User admin = ensureUser("admin", "admin@inventra.com", "Admin@123", "Admin User", Role.ADMIN);
                User manager1 = ensureUser("manager1", "manager1@inventra.com", "Manager@123", "Rahul Sharma",
                                Role.MANAGER);
                User manager2 = ensureUser("manager2", "manager2@inventra.com", "Manager@123", "Priya Menon",
                                Role.MANAGER);
                ensureUser("staff1", "staff1@inventra.com", "Staff@123", "Amit Kumar", Role.STAFF);
                ensureUser("staff2", "staff2@inventra.com", "Staff@123", "Sneha Rao", Role.STAFF);
                ensureUser("staff3", "staff3@inventra.com", "Staff@123", "Rohan Das", Role.STAFF);

                // Legacy default accounts
                ensureUser("manager", "manager@inventra.com", "manager123", "Default Manager", Role.MANAGER);
                ensureUser("staff", "staff@inventra.com", "staff123", "Default Staff", Role.STAFF);

                log.info("✅ User accounts ready.");

                // Skip product seeding if data already exists
                if (productRepository.count() > 0) {
                        log.info("✅ Products already exist — skipping product & category seed.");
                        printAccounts();
                        return;
                }

                // ── 2. CATEGORIES ─────────────────────────────────────────────────────
                Category mobiles = cat("Mobiles & Smartphones", "All smartphones and feature phones", null);
                Category laptops = cat("Laptops & Computers", "Laptops, desktops, and workstations", null);
                Category tablets = cat("Tablets & iPads", "Tablets and e-readers", null);
                Category tvs = cat("Televisions & Displays", "TVs, monitors, and projectors", null);
                Category audio = cat("Audio & Headphones", "Headphones, earbuds, speakers, soundbars", null);
                Category cameras = cat("Cameras & Photography", "Digital cameras, DSLRs, lenses, accessories", null);
                Category smartHome = cat("Smart Home & IoT", "Smart speakers, displays, lighting, IoT", null);
                Category gaming = cat("Gaming & Consoles", "Consoles, controllers, gaming accessories", null);
                Category accessories = cat("Accessories & Peripherals", "Chargers, cables, keyboards, mice, cases",
                                null);
                Category networking = cat("Networking & Connectivity", "Routers, switches, modems, mesh systems", null);

                // Sub-categories
                Category androidPhones = cat("Android Phones", "Android smartphones", mobiles);
                Category iPhones = cat("iPhones", "Apple iPhones", mobiles);
                Category gamingLaptops = cat("Gaming Laptops", "High-performance gaming laptops", laptops);
                Category ultrabooks = cat("Ultrabooks", "Slim, lightweight productivity laptops", laptops);
                Category wirelessAudio = cat("Wireless Audio", "Wireless headphones and earbuds", audio);

                log.info("✅ Categories seeded.");

                // ── 2b. MANAGER-CATEGORY ASSIGNMENTS ──────────────────────────────────
                // manager1 → Mobiles, Tablets, Audio, Gaming, Smart Home, Accessories
                // manager2 → Laptops, TVs, Cameras, Networking
                assignManagerCategory(manager1, admin, mobiles);
                assignManagerCategory(manager1, admin, tablets);
                assignManagerCategory(manager1, admin, audio);
                assignManagerCategory(manager1, admin, gaming);
                assignManagerCategory(manager1, admin, smartHome);
                assignManagerCategory(manager1, admin, accessories);
                assignManagerCategory(manager2, admin, laptops);
                assignManagerCategory(manager2, admin, tvs);
                assignManagerCategory(manager2, admin, cameras);
                assignManagerCategory(manager2, admin, networking);
                log.info("✅ Manager-category assignments seeded.");

                // ── 3. PRODUCTS ───────────────────────────────────────────────────────

                // ── MOBILES ──────────────────────────────────────────────────────────
                prod("Samsung Galaxy S24 Ultra 256GB", "SAMS24U-256", "8901234567890", mobiles, androidPhones,
                                "Samsung", "Galaxy S24 Ultra", 109900, 119999, 45, 10, 100,
                                "200MP camera, S-Pen, Snapdragon 8 Gen 3, 5000mAh", manager1);
                prod("Samsung Galaxy S24+ 256GB", "SAMS24P-256", "8901234567891", mobiles, androidPhones, "Samsung",
                                "Galaxy S24+", 79900, 89999, 60, 15, 120,
                                "Dynamic AMOLED 2X 6.7\", Snapdragon 8 Gen 3, 4900mAh", manager1);
                prod("Samsung Galaxy A55 5G 128GB", "SAMS-A55-128", "8901234567892", mobiles, androidPhones, "Samsung",
                                "Galaxy A55", 33999, 38999, 80, 20, 160,
                                "Super AMOLED 6.6\", 50MP OIS, 5000mAh, Exynos 1480", manager1);
                prod("Apple iPhone 15 Pro Max 256GB", "APPH15PM-256", "0194253430148", mobiles, iPhones, "Apple",
                                "iPhone 15 Pro Max", 134900, 159900, 35, 8, 80,
                                "A17 Pro, 48MP triple camera, Titanium, USB-C", manager1);
                prod("Apple iPhone 15 128GB", "APPH15-128", "0194253430155", mobiles, iPhones, "Apple", "iPhone 15",
                                69900, 79900, 55, 12, 110, "A16 Bionic, Dynamic Island, USB-C, 48MP main", manager1);
                prod("Apple iPhone 14 128GB", "APPH14-128", "0194253380148", mobiles, iPhones, "Apple", "iPhone 14",
                                55900, 64900, 40, 10, 80, "A15 Bionic, Crash Detection, Emergency SOS Satellite",
                                manager1);
                prod("OnePlus 12 256GB", "OP12-256", "8901826300015", mobiles, androidPhones, "OnePlus", "OnePlus 12",
                                60000, 69999, 70, 15, 150, "Snapdragon 8 Gen 3, Hasselblad camera, 100W SUPERVOOC",
                                manager1);
                prod("Google Pixel 8 Pro 128GB", "GPXL8P-128", "0842776111221", mobiles, androidPhones, "Google",
                                "Pixel 8 Pro", 79999, 92999, 30, 8, 60,
                                "Tensor G3, 7yr OS updates, Temperature sensor, 50MP triple", manager1);
                prod("Xiaomi Redmi Note 13 Pro+ 256GB", "XMI-RN13PP-256", "6941812711287", mobiles, androidPhones,
                                "Xiaomi", "Redmi Note 13 Pro+", 22000, 27999, 120, 25, 250,
                                "200MP OIS, Snapdragon 7s Gen 2, 120W Hyper Charge", manager1);
                prod("Realme 12 Pro+ 5G 256GB", "RM12PP-256", "6941764901012", mobiles, androidPhones, "Realme",
                                "Realme 12 Pro+", 24999, 29999, 90, 20, 200,
                                "Periscope telephoto, Samsung OLED, 67W SUPERVOOC", manager1);
                prod("Vivo V30 Pro 5G 256GB", "VIVO-V30P-256", "6935117894521", mobiles, androidPhones, "Vivo",
                                "V30 Pro", 34999, 39999, 65, 15, 130,
                                "ZEISS optics 50MP, 6.78\" AMOLED, MediaTek Dimensity 8200", manager1);
                prod("iQOO 12 5G 256GB", "IQOO12-256", "6941812741009", mobiles, androidPhones, "iQOO", "iQOO 12",
                                52999, 59999, 50, 12, 100, "Snapdragon 8 Gen 3, 144Hz AMOLED, 120W FlashCharge",
                                manager1);

                // ── LAPTOPS ──────────────────────────────────────────────────────────
                prod("Apple MacBook Pro 14\" M3 Pro", "APPMBP14-M3P", "0195949066849", laptops, ultrabooks, "Apple",
                                "MacBook Pro 14", 185000, 199900, 20, 5, 40,
                                "M3 Pro 11-core CPU, 18GB RAM, Liquid Retina XDR, 18hr battery", manager2);
                prod("Apple MacBook Air 15\" M3", "APPMBA15-M3", "0195949040726", laptops, ultrabooks, "Apple",
                                "MacBook Air 15", 129900, 149900, 25, 5, 50,
                                "M3 8-core CPU, 8GB RAM, 15.3\" Liquid Retina, 18hr battery", manager2);
                prod("Apple MacBook Air 13\" M2", "APPMBA13-M2", "0195949014146", laptops, ultrabooks, "Apple",
                                "MacBook Air 13", 94900, 114900, 30, 8, 60,
                                "M2 chip, 8GB RAM, 13.6\" Liquid Retina, MagSafe, fanless", manager2);
                prod("Dell XPS 15 9530 Core i7", "DELL-XPS15-9530", "5397184735892", laptops, ultrabooks, "Dell",
                                "XPS 15", 149999, 169999, 15, 4, 30,
                                "Core i7-13700H, 16GB DDR5, RTX 4060, 15.6\" OLED touch 3.5K", manager2);
                prod("ASUS ROG Zephyrus G14 2024", "ASUS-ROG-G14-24", "4711387405048", laptops, gamingLaptops, "ASUS",
                                "ROG Zephyrus G14", 129999, 149999, 18, 5, 35,
                                "Ryzen 9 8945HS, RTX 4070, 14\" 120Hz OLED, AniMe Matrix LED", manager2);
                prod("MSI Titan GT77 HX Core i9", "MSI-GT77HX", "4719072191467", laptops, gamingLaptops, "MSI",
                                "Titan GT77 HX", 229999, 259999, 8, 2, 15,
                                "Core i9-13980HX, RTX 4090 16GB, 17.3\" 4K miniLED 144Hz", manager2);
                prod("HP Spectre x360 14 Core i7", "HP-SPCX360-14", "194850978422", laptops, ultrabooks, "HP",
                                "Spectre x360", 149999, 169999, 12, 3, 25,
                                "Core i7-1355U, 16GB, OLED touch 2.8K, 2-in-1 convertible", manager2);
                prod("Lenovo ThinkPad X1 Carbon Gen 11", "LEN-X1C-G11", "4066055039628", laptops, ultrabooks, "Lenovo",
                                "ThinkPad X1 Carbon", 119999, 139999, 20, 5, 40,
                                "Intel vPro, 16GB, 14\" 2.8K OLED, 1.12kg, military-grade", manager2);
                prod("Acer Predator Helios 18 RTX 4080", "ACER-PH18-4080", "4710886995760", laptops, gamingLaptops,
                                "Acer", "Predator Helios 18", 199999, 229999, 10, 2, 20,
                                "Core i9-13900HX, RTX 4080 12GB, 18\" IPS 240Hz, 32GB DDR5", manager2);

                // ── TABLETS ──────────────────────────────────────────────────────────
                prod("Apple iPad Pro 12.9\" M2 256GB", "APPIPADPRO-M2", "0194253343959", tablets, null, "Apple",
                                "iPad Pro 12.9", 89999, 109900, 22, 5, 45,
                                "M2 chip, Liquid Retina XDR, Thunderbolt, Apple Pencil 2", manager1);
                prod("Apple iPad Air 5 M1 64GB", "APPIPADAIR5-64", "0194252397490", tablets, null, "Apple", "iPad Air",
                                59900, 69900, 35, 8, 70, "M1 chip, 10.9\" Liquid Retina, USB-C, Centre Stage camera",
                                manager1);
                prod("Samsung Galaxy Tab S9 Ultra 256GB", "SAMS9U-12GB", "8806094923070", tablets, null, "Samsung",
                                "Galaxy Tab S9 Ultra", 98999, 119999, 18, 4, 35,
                                "Snapdragon 8 Gen 2, 14.6\" Super AMOLED, S-Pen, IP68", manager1);
                prod("Xiaomi Pad 6 Pro 256GB", "XMI-PAD6P-256", "6941812721194", tablets, null, "Xiaomi", "Pad 6 Pro",
                                29999, 34999, 40, 10, 80, "Snapdragon 8+ Gen 1, 11\" 144Hz OLED, 10000mAh, 67W charge",
                                manager1);

                // ── TVs ───────────────────────────────────────────────────────────────
                prod("Sony Bravia XR A95L OLED 65\"", "SONY-A95L-65", "4548736145702", tvs, null, "Sony",
                                "Bravia XR A95L", 359999, 429999, 8, 2, 15,
                                "QD-OLED, Cognitive Processor XR, Google TV, 4K 120Hz", manager2);
                prod("Samsung QLED 4K Q80C 55\"", "SAMS-Q80C-55", "8806094817195", tvs, null, "Samsung", "QLED Q80C",
                                79999, 99999, 15, 3, 30, "Quantum Processor 4K, 120Hz, Quantum Matrix, Smart TV",
                                manager2);
                prod("LG OLED C3 55\"", "LG-C3-55", "8806091554284", tvs, null, "LG", "OLED C3", 129999, 159999, 10, 2,
                                20, "OLED evo panel, α9 AI Processor, webOS 23, 120Hz HFR", manager2);
                prod("Xiaomi Mi TV 5X Pro 55\"", "MI-TV5X-55", "6941812700427", tvs, null, "Xiaomi", "Mi TV 5X Pro",
                                38999, 49999, 25, 5, 50, "4K QLED, PatchWall 4, Dolby Vision, 30W Dolby Atmos speakers",
                                manager2);
                prod("OnePlus TV Q2 Pro 65\"", "OP-TVQ2P-65", "6921815602543", tvs, null, "OnePlus", "TV Q2 Pro", 59999,
                                74999, 12, 3, 25, "QLED 4K, Gamma Engine, 65W 2.1 Dolby Atmos, OxygenPlay 2.0",
                                manager2);

                // ── AUDIO ─────────────────────────────────────────────────────────────
                prod("Sony WH-1000XM5 Wireless ANC", "SONY-WH1000XM5", "4548736132404", audio, wirelessAudio, "Sony",
                                "WH-1000XM5", 24999, 34990, 50, 10, 100,
                                "Best-in-class ANC, 30hr, Multipoint, LDAC, USB-C, speak-to-chat", manager1);
                prod("Apple AirPods Pro 2nd Gen", "APP-AIRPODSP2", "0194253416579", audio, wirelessAudio, "Apple",
                                "AirPods Pro", 19999, 24900, 65, 15, 130,
                                "H2 chip, Adaptive Transparency, 6hr+30hr case, MagSafe", manager1);
                prod("Bose QuietComfort 45", "BOSE-QC45", "017817834667", audio, wirelessAudio, "Bose",
                                "QuietComfort 45", 22000, 32000, 35, 8, 70,
                                "World-class ANC, 24hr battery, TriPort acoustic, USB-C", manager1);
                prod("Samsung Galaxy Buds2 Pro", "SAMS-GBP2", "8806094524826", audio, wirelessAudio, "Samsung",
                                "Galaxy Buds2 Pro", 13000, 17990, 60, 15, 120,
                                "Hi-Fi 24bit audio, 360 Audio, IPX7, 8hr battery, ANC", manager1);
                prod("JBL Charge 5 Portable Speaker", "JBL-CHG5", "050036377032", audio, null, "JBL", "Charge 5", 13000,
                                18000, 80, 20, 160, "IP67 waterproof, 20hr playtime, PartyBoost, built-in powerbank",
                                manager1);
                prod("Harman Kardon Aura Studio 4", "HK-AURA4", "050036377049", audio, null, "Harman Kardon",
                                "Aura Studio 4", 25999, 34999, 20, 5, 40,
                                "360° immersive sound, crystal dome design, Bluetooth 5.0", manager1);

                // ── CAMERAS ───────────────────────────────────────────────────────────
                prod("Sony Alpha A7 IV Mirrorless Body", "SONY-A7IV-B", "4548736133464", cameras, null, "Sony",
                                "Alpha A7 IV", 229999, 272990, 10, 2, 20,
                                "33MP BSI CMOS, 4K 60p, 10fps burst, real-time eye/animal/bird AF", manager2);
                prod("Canon EOS R6 Mark II Body", "CANON-R6M2-B", "4549292200836", cameras, null, "Canon",
                                "EOS R6 Mark II", 199999, 234999, 8, 2, 15,
                                "24.2MP CMOS, 40fps burst, 4K 60p uncropped, In-Body Stabilization", manager2);
                prod("GoPro HERO 12 Black", "GPRO-H12-BLK", "818279029042", cameras, null, "GoPro", "HERO 12 Black",
                                32000, 39990, 30, 8, 60,
                                "5.3K60 video, HyperSmooth 6.0, HDR, waterproof 10m, Enduro battery", manager2);

                // ── GAMING ────────────────────────────────────────────────────────────
                prod("Sony PlayStation 5 Disc Edition", "SONY-PS5-STD", "711719541028", gaming, null, "Sony",
                                "PlayStation 5", 44990, 54990, 25, 5, 50,
                                "AMD Zen 2 CPU, RDNA 2 12 TF GPU, 825GB SSD, DualSense haptics", manager1);
                prod("Microsoft Xbox Series X", "MSFT-XBSX", "889842640816", gaming, null, "Microsoft", "Xbox Series X",
                                41990, 51990, 20, 5, 40, "12 TF GPU, 1TB NVMe SSD, Quick Resume, 4K 120fps, Game Pass",
                                manager1);
                prod("Nintendo Switch OLED Model", "NIN-SWOLED", "045496453442", gaming, null, "Nintendo",
                                "Switch OLED", 29999, 35499, 35, 8, 70,
                                "7\" OLED screen, enhanced audio, 64GB, dock with LAN port", manager1);
                prod("DualSense Wireless Controller", "SONY-DUAL-CTRL", "711719376309", gaming, null, "Sony",
                                "DualSense", 6499, 7990, 60, 15, 120,
                                "Haptic feedback, adaptive triggers, USB-C, built-in mic", manager1);

                // ── ACCESSORIES ───────────────────────────────────────────────────────
                prod("Apple MagSafe Charger 15W 1m", "APP-MAGSAFE-15", "0194253436034", accessories, null, "Apple",
                                "MagSafe Charger", 3999, 4900, 150, 30, 300,
                                "15W wireless MagSafe, compatible iPhone 12+, 1m cable", manager1);
                prod("Anker 140W GaN USB-C Charger", "ANK-GAN140W", "0848061099130", accessories, null, "Anker",
                                "GaNPrime 140W", 6000, 8499, 100, 20, 200,
                                "140W GaN5, 3 ports (2C+1A), foldable plug, ActiveShield 2.0", manager1);
                prod("Anker 7-in-1 USB-C Hub", "ANK-USBC-HUB", "0848061099123", accessories, null, "Anker", "USB-C Hub",
                                3500, 5499, 100, 20, 200, "4K HDMI, 100W PD, 2×USB-A 3.0, SD+microSD, USB-C data",
                                manager1);
                prod("Logitech MX Keys S Keyboard", "LOG-MXKEYS-S", "097855194534", accessories, null, "Logitech",
                                "MX Keys S", 10000, 13995, 60, 15, 120,
                                "Backlit, Bluetooth multi-device, USB-C, perfect stroke keys", manager2);
                prod("Logitech MX Master 3S Mouse", "LOG-MXMAS3S", "097855148055", accessories, null, "Logitech",
                                "MX Master 3S", 8999, 11999, 70, 15, 140,
                                "8000 DPI, MagSpeed scroll, USB-C, silent clicks, Flow cross-computer", manager2);
                prod("Belkin iPhone 15 Case - Clear", "BLK-IP15-CLR", "745883847792", accessories, null, "Belkin",
                                "iPhone 15 Case", 999, 1799, 200, 40, 400,
                                "MagSafe compatible, anti-microbial, military grade drop protection", manager1);
                prod("Samsung 45W USB-C Wall Charger", "SAMS-45W-CHG", "8806094754506", accessories, null, "Samsung",
                                "45W Charger", 2500, 3499, 120, 25, 240,
                                "Super Fast Charging 2.0, 45W PPS, USB-C cable included", manager1);

                // ── NETWORKING ────────────────────────────────────────────────────────
                prod("TP-Link Archer AXE300 WiFi 6E Router", "TPL-AXE300", "4895252502237", networking, null, "TP-Link",
                                "Archer AXE300", 22000, 29999, 20, 5, 40,
                                "WiFi 6E, Tri-band 19000Mbps, 6GHz, 8 antennas, 2.5G WAN", manager2);
                prod("Netgear Orbi RBK863S Mesh WiFi 6", "NGR-ORB863S", "606449155879", networking, null, "Netgear",
                                "Orbi RBK863S", 69999, 84999, 12, 3, 25,
                                "WiFi 6, tri-band, covers 7500 sq ft, 10Gbps Ethernet port", manager2);
                prod("TP-Link TL-SG108 8-Port Gigabit Switch", "TPL-SG108", "6935364021092", networking, null,
                                "TP-Link", "TL-SG108", 999, 1499, 60, 15, 120,
                                "8-port Gigabit, unmanaged, plug-and-play, fanless design", manager2);

                // ── SMART HOME ────────────────────────────────────────────────────────
                prod("Amazon Echo Dot 5th Gen", "AMZ-ECHDOT5", "840268988012", smartHome, null, "Amazon", "Echo Dot",
                                3999, 5499, 100, 20, 200,
                                "Alexa, improved bass, motion sensor, Sidewalk, eero WiFi support", manager1);
                prod("Google Nest Hub 2nd Gen 7\"", "GOOG-NSTHUV2", "0842776124086", smartHome, null, "Google",
                                "Nest Hub", 5999, 7999, 55, 12, 110,
                                "7\" display, Sleep Sensing, ambient EQ, Chromecast built-in", manager1);
                prod("Philips Hue Starter Kit 4 Bulbs", "PHL-HUE-STRT", "046677562854", smartHome, null, "Philips",
                                "Hue Starter Kit", 7999, 9999, 40, 10, 80,
                                "4 color bulbs + Bridge, 16M colors, works with Alexa/Google/Siri", manager1);
                prod("Amazon Echo Show 8 3rd Gen", "AMZ-ECSHOW8", "840268993900", smartHome, null, "Amazon",
                                "Echo Show 8", 9999, 12999, 35, 8, 70,
                                "8\" HD touchscreen, Alexa, 13MP camera, spatial audio, smart home hub", manager1);

                log.info("✅ Products seeded: 55+ electronics products across all categories.");
                printAccounts();
        }

        // ─── Helpers ─────────────────────────────────────────────────────────────

        private User ensureUser(String username, String email, String password, String fullName, Role role) {
                return userRepository.findByUsername(username).orElseGet(() -> {
                        User u = new User();
                        u.setUsername(username);
                        u.setEmail(email);
                        u.setPassword(passwordEncoder.encode(password));
                        u.setFullName(fullName);
                        u.setRole(role);
                        u.setEnabled(true);
                        u.setAccountNonExpired(true);
                        u.setAccountNonLocked(true);
                        u.setCredentialsNonExpired(true);
                        u.setFailedLoginAttempts(0);
                        return userRepository.save(u);
                });
        }

        private Category cat(String name, String description, Category parent) {
                return categoryRepository.findByName(name).orElseGet(() -> {
                        Category c = new Category();
                        c.setName(name);
                        c.setDescription(description);
                        c.setParentCategory(parent);
                        c.setIsActive(true);
                        return categoryRepository.save(c);
                });
        }

        private void prod(String name, String sku, String barcode,
                        Category category, Category subCategory,
                        String manufacturer, String brand,
                        double costPrice, double sellingPrice,
                        int stock, int reorder, int maxStock,
                        String description, User createdBy) {

                if (productRepository.existsBySku(sku))
                        return;

                Product p = new Product();
                p.setName(name);
                p.setSku(sku);
                p.setBarcode(barcode);
                p.setCategory(category);
                p.setSubCategory(subCategory);
                p.setManufacturer(manufacturer);
                p.setBrand(brand);
                p.setCostPrice(BigDecimal.valueOf(costPrice));
                p.setSellingPrice(BigDecimal.valueOf(sellingPrice));
                p.setCurrentStock(stock);
                p.setReorderLevel(reorder);
                p.setMaxStockLevel(maxStock);
                p.setUnitOfMeasure("PCS");
                p.setDescription(description);
                p.setStatus(ProductStatus.ACTIVE);
                p.setCurrency("INR");
                p.setIsDeleted(false);
                p.setCreatedBy(createdBy);
                p.setUpdatedBy(createdBy);

                productRepository.save(p);
        }

        /**
         * Idempotent: creates a ManagerCategoryAssignment only if one doesn't already
         * exist.
         */
        private void assignManagerCategory(User manager, User assignedBy, Category category) {
                if (manager == null || category == null)
                        return;
                boolean exists = managerCatRepo
                                .findByManagerIdAndCategoryIdAndIsActiveTrue(manager.getId(), category.getId())
                                .isPresent();
                if (exists)
                        return;

                ManagerCategoryAssignment mca = new ManagerCategoryAssignment();
                mca.setManager(manager);
                mca.setCategory(category);
                mca.setAssignedBy(assignedBy);
                mca.setIsActive(true);
                mca.setAssignedAt(LocalDateTime.now());
                managerCatRepo.save(mca);
        }

        private void printAccounts() {
                log.info("╔══════════════════════════════════════════════════════╗");
                log.info("║           INVENTRA TEST ACCOUNTS                     ║");
                log.info("╠══════════════════════════════════════════════════════╣");
                log.info("║  ADMIN   : admin      / Admin@123                    ║");
                log.info("║  MANAGER : manager1   / Manager@123                  ║");
                log.info("║  MANAGER : manager2   / Manager@123                  ║");
                log.info("║  STAFF   : staff1     / Staff@123                    ║");
                log.info("║  STAFF   : staff2     / Staff@123                    ║");
                log.info("║  STAFF   : staff3     / Staff@123                    ║");
                log.info("╚══════════════════════════════════════════════════════╝");
        }
}
