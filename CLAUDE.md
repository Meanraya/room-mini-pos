# Room Scent · Shop + POS

Next.js (App Router, **JavaScript**) + Supabase, deploy บน Vercel

## โครงสร้าง
- `app/(shop)/*` หน้าร้านลูกค้า (ไม่ต้องล็อกอิน) ตะกร้าเก็บใน localStorage ผ่าน `components/CartContext.js`
- `app/admin/*` หลังร้าน ครอบด้วย `components/AdminShell.js` (ต้องล็อกอิน Supabase Auth)
- `app/api/orders` สั่งซื้อออนไลน์ → RPC `place_online_order` + LINE
- `app/api/pos/checkout` ขายหน้าร้าน (ต้องแนบ Bearer token พนักงาน) → RPC `pos_checkout` + LINE
- `lib/line.js` ส่ง LINE ฝั่งเซิร์ฟเวอร์เท่านั้น รวมเป็น 1 ข้อความต่อครั้ง (LINE จำกัด 5 ข้อความ/ครั้ง)

## ฐานข้อมูล (`supabase/schema.sql`)
- products, orders, sales (sales.channel = 'pos' | 'online')
- การตัดสต็อกทุกครั้งต้องผ่านฟังก์ชัน `pos_checkout` / `place_online_order` / `set_order_status` เท่านั้น
  อย่าอัปเดต stock จากหน้าเว็บโดยตรงตอนขาย (กันขายเกินเมื่อขายพร้อมกัน)
- ราคาเชื่อจากฐานข้อมูลเท่านั้น ไม่รับราคาจากเบราว์เซอร์
- anon เห็นเฉพาะ products ที่ `online = true`; orders/sales อ่านได้เฉพาะพนักงาน

## ดีไซน์
- โทเคนและอนิเมชันอยู่ใน `app/globals.css` (Linen & Bronze) ฟอนต์ผ่าน next/font ใน `app/layout.js`
- รูปใน `public/images` ย่อแล้ว (~200 KB) อย่าใส่รูปขนาดหลาย MB
- เคารพ `prefers-reduced-motion`
