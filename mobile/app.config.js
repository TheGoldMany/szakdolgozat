/**
 * Az `app.json` kiegészítése azzal, ami NEM kerülhet verziókezelésbe.
 *
 * Miért van egyáltalán ez a fájl: a Google Maps Androidon API-kulcsot vár, és
 * az `app.json` statikus JSON — nem tud környezeti változót behelyettesíteni.
 * Az Expo viszont az `app.config.js`-t az `app.json` FÖLÉ olvassa be, és
 * megkapja a benne lévő beállításokat (`config`), így elég a hiányzó darabot
 * hozzátenni. Az `app.json` marad a beállítások helye, ide csak a kulcs kerül.
 *
 * iOS-hez NINCS kulcs: ott az Apple Maps megy, ami nem kér ilyet.
 *
 * Ha a kulcs hiányzik, az Android build lefordul, de a térkép SZÜRKE marad —
 * ez a leggyakoribb „miért nem működik" ok. A kulcsot EAS titokként kell
 * felvenni (`eas secret:create --name GOOGLE_MAPS_API_KEY`), lásd
 * docs/20-mobil-kiadas.md.
 */
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY ?? "" },
    },
  },
});
