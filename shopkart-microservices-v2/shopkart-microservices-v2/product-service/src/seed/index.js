require('dotenv').config();
const connectDB = require('../config/db');
const Category = require('../models/Category');
const Product = require('../models/Product');
const categories = [
  {name:'Electronics',emoji:'📱',sortOrder:1},{name:'Fashion',emoji:'👗',sortOrder:2},
  {name:'Home & Kitchen',emoji:'🏠',sortOrder:3},{name:'Sports',emoji:'⚽',sortOrder:4},
  {name:'Beauty',emoji:'💄',sortOrder:5},{name:'Books',emoji:'📚',sortOrder:6},
];
const run = async () => {
  await connectDB();
  for(const cat of categories){ const e=await Category.findOne({name:cat.name}); if(!e) await Category.create(cat); }
  console.log('Categories seeded');
  const elec = await Category.findOne({name:'Electronics'});
  const fashion = await Category.findOne({name:'Fashion'});
  const products = [
    {name:'Samsung Galaxy S24 Ultra',brand:'Samsung',category:elec._id,description:'200MP camera, S Pen, AI features',emoji:'📱',price:89999,mrp:134999,stock:48,isFeatured:true,isBestSeller:true,freeDelivery:true,totalSold:1200,tags:['smartphone','samsung','5g']},
    {name:'Sony WH-1000XM5',brand:'Sony',category:elec._id,description:'Industry-leading ANC headphones',emoji:'🎧',price:24999,mrp:34990,stock:87,isFeatured:true,isBestSeller:true,freeDelivery:true,totalSold:628,tags:['headphones','anc','sony']},
    {name:"Levi's 511 Slim Fit Jeans",brand:"Levi's",category:fashion._id,description:'Classic slim fit stretch denim',emoji:'👖',price:2999,mrp:4999,stock:150,isBestSeller:true,totalSold:2100,tags:['jeans','denim','fashion']},
  ];
  for(const p of products){ const e=await Product.findOne({name:p.name}); if(!e) await Product.create(p); }
  console.log('Products seeded');
  process.exit(0);
};
run().catch(e=>{console.error(e);process.exit(1);});
