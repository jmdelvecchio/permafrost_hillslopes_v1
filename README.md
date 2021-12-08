# permafrost_hillslopes_v1

This repository contains files that (1) show how raw data files are acquired (DEMs, basins and channel networks, satellite-derived metrics, etc.) and (2) the complete workflow for taking a number of rasters ("stack") and extracting their values at certain landscape positions, and calculating how topographic metrics, ecological metrics, and InSAR-derived surface displacements covary on soil-mantled hillslopes in the discontinous permafrost of the Seward Peninsula, Alaska. 

I leverage Google Earth Engine's code editor, GEE's access to Sentinel-2 data, and PlanetScope 3m 4-band imagery to calculate vegetation and moisture indices.

I then employ the University of Edinburgh's LSDTopoToolbox algorithms to calculate topographic metrics, delineate channel networks and drainage basins on a 2-m digital elevation model from ArcticDEM, which uses photogrammetry to create elevation models at high latitudes. 

I compare the landscape metrics to InSAR-derived surface displacement measurements, presented as an annual average displacement from late July measurements from 2014-2019. 

I then employ standard Python geospatial data processing packages (Rasterio, GeoPandas, RioXarray, Shapely) to perform my analyses. 
