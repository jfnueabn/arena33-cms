const reserved=new Set(['home','shared','admin','api','en','ms','zh','public','uploads','images','css','js','node_modules','robots','sitemap','favicon']);
module.exports=value=>typeof value==='string'&&value.length<=64&&/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value)&&!reserved.has(value);
