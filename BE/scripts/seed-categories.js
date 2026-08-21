/**
 * Seed lại categories và pestType cho sản phẩm nông nghiệp ASAKA.
 *
 * Tạo đúng 4 loại category + pestType options.
 * Gán category đúng cho từng sản phẩm hiện có.
 * Xóa categories test / E2E / smoke test.
 *
 * Usage (from BE/): node scripts/seed-categories.js
 */
require('dotenv').config()
const { MongoClient } = require('mongodb')

const CAT_DEFS = [
  {
    name: 'Thuốc trừ sâu',
    slug: 'thuoc-tru-sau',
    description: 'Thuốc diệt sâu, rệp, nhện, bọ trĩ, bọ phấn',
    pestTypes: [
      { value: 'sau-duc-than', label: 'Sâu đục thân' },
      { value: 'sau-an-la', label: 'Sâu ăn lá' },
      { value: 'sau-non', label: 'Sâu non' },
      { value: 'rep-nau', label: 'Rệp nâu' },
      { value: 'rep-xanh', label: 'Rệp xanh' },
      { value: 'nhan-do', label: 'Nhện đỏ' },
      { value: 'bo-tri', label: 'Bọ trĩ' },
      { value: 'bo-phan', label: 'Bọ phấn' },
      { value: 'ruoi-duc-la', label: 'Ruồi đục lá' },
      { value: 'cuong-trang', label: 'Cương trắng' },
      { value: 'om-giac-sinh', label: 'Ốm giác sinh' },
      { value: 'khac', label: 'Khác' }
    ]
  },
  {
    name: 'Thuốc trừ bệnh',
    slug: 'thuoc-tru-benh',
    description: 'Thuốc diệt nấm bệnh, vi khuẩn',
    pestTypes: [
      { value: 'nam-muop', label: 'Nấm mốc / Sương mai' },
      { value: 'than-thu', label: 'Thán thư' },
      { value: 'dot-la', label: 'Đốm lá' },
      { value: 'thoi-re', label: 'Thối rễ' },
      { value: 'thoi-trai', label: 'Thối trái' },
      { value: 'dao-on', label: 'Đạo ôn' },
      { value: 'ghe-cam', label: 'Ghẻ cám / Ghẻ nhám' },
      { value: 'vang-la', label: 'Vàng lá / Vàng lùn' },
      { value: 'sug-tuc', label: 'Sượng túc (nhãn)' },
      { value: 'khac', label: 'Khác' }
    ]
  },
  {
    name: 'Thuốc trừ cỏ',
    slug: 'thuoc-tru-co',
    description: 'Thuốc diệt cỏ dại',
    pestTypes: [
      { value: 'co-lang-ngu', label: 'Cỏ lồng ngự' },
      { value: 'co-la-toi', label: 'Cỏ lá tỏi' },
      { value: 'co-bong-trang', label: 'Cỏ bông trắng' },
      { value: 'co-duoi-chuot', label: 'Cỏ đuôi chuột' },
      { value: 'co-trau', label: 'Cỏ trâu / Dền' },
      { value: 'co-mo', label: 'Cỏ mỡ / Cỏ đuôi phụng' },
      { value: 'co-chit', label: 'Cỏ chít' },
      { value: 'khac', label: 'Khác' }
    ]
  },
  {
    name: 'Phân bón',
    slug: 'phan-bon',
    description: 'Phân bón NPK, phân lá, phân hữu cơ, vi lượng, ra rễ',
    pestTypes: [
      { value: 'npk', label: 'NPK' },
      { value: 'phan-la', label: 'Phân bón lá' },
      { value: 'phan-huu-co', label: 'Phân hữu cơ' },
      { value: 'phan-vi-sinh', label: 'Phân vi sinh' },
      { value: 'vi-luong', label: 'Vi lượng' },
      { value: 'ra-ro', label: 'Ra rễ / Kích rễ' },
      { value: 'lan', label: 'Lân' },
      { value: 'kali', label: 'Kali' },
      { value: 'canxi', label: 'Canxi / Bo' },
      { value: 'khac', label: 'Khác' }
    ]
  }
]

// Map sản phẩm → (categorySlug, pestType)
const PRODUCT_MAPPINGS = [
  // Thuốc trừ sâu
  { nameContains: 'BILLADEN', category: 'thuoc-tru-sau', pestType: 'sau-an-la' },
  { nameContains: 'CAYMANGOLD', category: 'thuoc-tru-sau', pestType: 'sau-non' },
  { nameContains: 'CYDIME', category: 'thuoc-tru-sau', pestType: 'sau-duc-than' },
  { nameContains: 'Haihamec', category: 'thuoc-tru-sau', pestType: 'sau-an-la' },
  { nameContains: 'NAS 60EC', category: 'thuoc-tru-sau', pestType: 'nhan-do' },
  { nameContains: 'THADANT', category: 'thuoc-tru-sau', pestType: 'sau-duc-than' },
  // Thuốc trừ bệnh
  { nameContains: 'Bretil Super', category: 'thuoc-tru-benh', pestType: 'nam-muop' },
  { nameContains: 'MANCO-ASAKA', category: 'thuoc-tru-benh', pestType: 'nam-muop' },
  { nameContains: 'MI STOP', category: 'thuoc-tru-benh', pestType: 'than-thu' },
  { nameContains: 'Mekongvil', category: 'thuoc-tru-benh', pestType: 'dot-la' },
  { nameContains: 'NOFADA', category: 'thuoc-tru-benh', pestType: 'dao-on' },
  // Thuốc trừ cỏ
  { nameContains: 'FALCAO', category: 'thuoc-tru-co', pestType: 'co-lang-ngu' },
  { nameContains: 'HORTENSIA', category: 'thuoc-tru-co', pestType: 'co-lang-ngu' },
  // Phân bón
  { nameContains: 'AV2-963BOZIN', category: 'phan-bon', pestType: 'npk' },
  { nameContains: 'V7 ASAKA', category: 'phan-bon', pestType: 'npk' },
  { nameContains: 'NPK - Lân 02', category: 'phan-bon', pestType: 'npk' },
  { nameContains: 'HUMIC', category: 'phan-bon', pestType: 'phan-huu-co' },
  { nameContains: 'EPNON', category: 'phan-bon', pestType: 'phan-la' },
  { nameContains: 'vi lượng siêu ra rễ', category: 'phan-bon', pestType: 'ra-ro' },
  { nameContains: 'AV-Root', category: 'phan-bon', pestType: 'ra-ro' }
]

async function main() {
  const uri = process.env.MONGODB_URI
  const dbName = process.env.DATABASE_NAME
  if (!uri || !dbName) throw new Error('Missing MONGODB_URI or DATABASE_NAME')

  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db(dbName)

  console.log(`DB: ${dbName}`)

  // 1. Xóa categories cũ (không phải 4 loại chính) và categories test
  const slugSet = new Set(CAT_DEFS.map(c => c.slug))
  await db.collection('product_categories').updateMany(
    { slug: { $nin: [...slugSet] }, _destroy: false },
    { $set: { _destroy: true, updatedAt: new Date() } }
  )
  console.log('Đã soft-delete categories không thuộc 4 loại chính')

  // 2. Tạo hoặc cập nhật 4 categories chính
  const catMap = {}
  for (const def of CAT_DEFS) {
    const existing = await db.collection('product_categories').findOne({ slug: def.slug, _destroy: false })
    if (existing) {
      await db.collection('product_categories').updateOne(
        { _id: existing._id },
        {
          $set: {
            name: def.name,
            description: def.description,
            status: 'active',
            updatedAt: new Date(),
            pestTypes: def.pestTypes
          }
        }
      )
      catMap[def.slug] = existing._id
      console.log(`Updated category: ${def.name}`)
    } else {
      // Tìm admin user đầu tiên
      const admin = await db.collection('users').findOne({
        $or: [{ role: 'admin' }, { roles: 'admin' }],
        _destroy: { $ne: true }
      })
      const result = await db.collection('product_categories').insertOne({
        name: def.name,
        slug: def.slug,
        description: def.description,
        status: 'active',
        pestTypes: def.pestTypes,
        createdBy: admin?._id || null,
        createdAt: new Date(),
        updatedAt: null,
        _destroy: false
      })
      catMap[def.slug] = result.insertedId
      console.log(`Created category: ${def.name}`)
    }
  }

  // 3. Gán lại category + pestType cho từng sản phẩm
  const allProducts = await db.collection('products').find({
    status: 'active',
    _destroy: { $ne: true }
  }).toArray()

  let updatedCount = 0
  for (const product of allProducts) {
    const mapping = PRODUCT_MAPPINGS.find(m =>
      product.name.toUpperCase().includes(m.nameContains.toUpperCase())
    )
    if (mapping) {
      const newCatId = catMap[mapping.category]
      if (newCatId && product.categoryId.toString() !== newCatId.toString()) {
        await db.collection('products').updateOne(
          { _id: product._id },
          {
            $set: {
              categoryId: newCatId,
              pestType: mapping.pestType,
              updatedAt: new Date()
            }
          }
        )
        updatedCount++
        console.log(`  [${mapping.category}] "${product.name}" → pestType: ${mapping.pestType}`)
      } else if (newCatId) {
        // Đúng category rồi, chỉ update pestType nếu chưa có
        await db.collection('products').updateOne(
          { _id: product._id, pestType: { $in: [null, '', undefined] } },
          {
            $set: {
              pestType: mapping.pestType,
              updatedAt: new Date()
            }
          }
        )
      }
    } else {
      console.log(`  [UNMATCHED] "${product.name}"`)
    }
  }

  console.log(`\n=== Tổng kết ===`)
  console.log(`Categories: ${CAT_DEFS.length}`)
  console.log(`Products updated: ${updatedCount}`)

  // In lại tất cả product sau khi update
  console.log('\n=== Products sau khi tách ===')
  const cats = await db.collection('product_categories').find({ _destroy: false, status: 'active' }).toArray()
  const catLookup = {}
  cats.forEach(c => catLookup[c._id.toString()] = c.name)

  const prods = await db.collection('products').find({
    status: 'active',
    _destroy: { $ne: true }
  }).toArray()
  prods.forEach(p => {
    console.log(`[${catLookup[p.categoryId.toString()] || '?'}] ${p.name} | pestType: ${p.pestType || '-'}`)
  })

  await client.close()
  console.log('\nDone.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
