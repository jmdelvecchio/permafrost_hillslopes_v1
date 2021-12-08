//////
// For Del Vecchio et al (2021) AGU 
// Uses PlanetScope and Sentinel-2 imagery
//////

var geometry = ee.Geometry.Rectangle(
  -166.29304239358078, 65.06417420047694, -166.21373483742843, 65.08833579524847
  )

var export_geometry = ee.Geometry.Rectangle(
  -166.57919095284748, 64.9747112698095, -165.92275784737873, 65.25555595006479
  )


Map.addLayer(geometry, {}, 'S2 filterBounds', false)
Map.addLayer(export_geometry, {}, "Geometry for Export", false)
/////
// This function mosaics your Planet imagery by date
/////
function mosaicByDate(imcol){
  // imcol: An image collection
  // returns: An image collection
  var imlist = imcol.toList(imcol.size())

  var unique_dates = imlist.map(function(im){
    return ee.Image(im).date().format("YYYY-MM-dd")
  }).distinct()

  var mosaic_imlist = unique_dates.map(function(d){
    d = ee.Date(d)

    var im = imcol
      .filterDate(d, d.advance(1, "day"))
      .mosaic()

    return im.set(
        "system:time_start", d.millis(), 
        "system:id", d.format("YYYY-MM-dd"))
  })

  return ee.ImageCollection(mosaic_imlist)
}
var planet = imageCollection

var mosaics = mosaicByDate(planet)
///https://gis.stackexchange.com/questions/280156/mosaicking-image-collection-by-date-day-in-google-earth-engine

/////
//Then, mask out very white clouds and snow from RBG
////
function maskPSwhite(image) {

  var grayscale = image.expression(
        '(0.3 * R) + (0.59 * G) + (0.11 * B)', {
        'R': image.select('B3'),
        'G': image.select('B2'),
        'B': image.select('B1')
  });

  var mask = 
  grayscale.lt(1000.0) //mask white
  //.and(grayscale.gt(400.0)) //mask black, but S2 doesn't so whatev
   var date = image.get('system:time_start');
  return image.updateMask(mask).addBands(grayscale);
  //https://stackoverflow.com/questions/57633820/convert-rgb-image-to-single-band-grayscale-image-within-google-earth-engine-usin

}

var mosaics_masked = mosaics.map(maskPSwhite)

///
//Calculate NDVI for PS imagery
var Aug = mosaics_masked.filterDate('2019-08-20').first()
var Jun = mosaics_masked.filterDate('2019-06-15').first()

///
var nir = Aug.select('B4');
var red = Aug.select('B3');
var ndvi_Aug = nir.subtract(red).divide(nir.add(red)).rename('NDVI');

var nir = Jun.select('B4');
var red = Jun.select('B3');
var ndvi_Jun = nir.subtract(red).divide(nir.add(red)).rename('NDVI');

var PS_ndvi_diff = ndvi_Aug.subtract(ndvi_Jun)

////////////////

// The following is Sentinel-2 (S2) cloud masking example from GEE
// which I adapted to mask snow, too
/**
 * Function to mask clouds using the Sentinel-2 QA band
 * @param {ee.Image} image Sentinel-2 image
 * @return {ee.Image} cloud masked Sentinel-2 image
 */
function maskS2clouds(image) {
  var qa = image.select('QA60');

  var date = image.get('system:time_start'); //new
  
  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask).divide(10000).set('system:time_start', date);
}

//// I wrote this to mask out snow
function maskS2snow(image) {

  var ndsi = image.normalizedDifference(['B2', 'B11']);
  var ndwi = image.normalizedDifference(['B3', 'B8A']);

  var mask = 
  ndsi.lt(0.0)
  
   var date = image.get('system:time_start');
  return image.updateMask(mask).set('system:time_start', date);
}

function time(image) {
  var date = image.get('system:time_start');
  return image.set('system:time_start', date);
}


var dataset = ee.ImageCollection('COPERNICUS/S2')
                  .filter(ee.Filter.calendarRange(2019,2019,'year'))
                  .filter(ee.Filter.calendarRange(6,9,'month'))
                  // Pre-filter to get less cloudy granules.
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 25))
                  .filterBounds(geometry)
                  .map(maskS2clouds)
                  .map(maskS2snow);
                  
                  
                  
                  
////////
// Add spectral indices to S2 images
var addNDWI = function(image) {
  var ndwi = image.normalizedDifference(['B3', 'B8A']).rename('NDWI');
  return image.addBands(ndwi);
};

var dataset = dataset.map(addNDWI);

var addNDMI = function(image) {
  var ndmi = image.normalizedDifference(['B8A', 'B11']).rename('NDMI');
  return image.addBands(ndmi);
};

var dataset = dataset.map(addNDMI);

var addNDSI = function(image) {
  var ndsi = image.normalizedDifference(['B2', 'B11']).rename('NDSI');
  return image.addBands(ndsi);
};

var addNDVI = function(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  return image.addBands(ndvi);
};

var dataset = dataset.map(addNDSI);

var dataset = dataset.map(addNDVI)

var ndmi_st = dataset.select('NDMI')
.reduce(ee.Reducer.stdDev())

var ndwi_st = dataset.select('NDWI')
.reduce(ee.Reducer.stdDev())

var ndvi_st = dataset.select('NDVI')
.reduce(ee.Reducer.stdDev())

var ndvi_max = dataset.select('NDVI')
.reduce(ee.Reducer.max())

///////

//////
//



//// Visualization parameters:
var ps_viz = {
  "opacity":1,
  "bands":["B3","B2","B1"],
  "min":405.79,
  "max":4499.71,
  "gamma":2.331
  
}

var ndvi_viz={
  min: 0.1,
  max: 0.8,
  palette: 'brown, blanchedalmond, #8FBC8F, #006400'
}

var wet_params = {
  min: -1.0,
  max: 1.0,
  palette: ['yellow', 'blue'],
};

var sno_params = {
  min: 0,
  max: 1,
  palette: ['yellow', 'blue'],
};

var st_params = {
  min: 0.05,
  max: 0.10,
  palette: ['white', 'blue'],
};

var veg_params = {
  min: 0.0,
  max: 0.25,
  palette: ['white', 'green'],
};

Map.addLayer(Jun, ps_viz, 'Jun', true)
Map.addLayer(ndvi_Jun, ndvi_viz, 'NDVI Jun', true)

Map.addLayer(Aug, ps_viz, 'August', true)
Map.addLayer(ndvi_Aug, ndvi_viz, 'NDVI August', true)

Map.addLayer(dataset.select("NDWI").first(), wet_params, 'NDWI image', true);
Map.addLayer(ndwi_st, st_params, 'NDWI stDev', true);

Map.addLayer(dataset.select('NDMI'), wet_params, 'NDMI image', true);
Map.addLayer(ndmi_st, st_params, 'NDMI stDev', true);


