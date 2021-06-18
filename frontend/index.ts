import 'promise-polyfill/src/polyfill'
import FingerprintJS from '@fingerprintjs/fingerprintjs'

async function getVisitorData() {
  const fp = await FingerprintJS.load()
  return await fp.get()
}

async function startPlayground() {
  const potEndpoint = 'https://pot.beveradb.com/api'
  const startTime = Date.now()

  try {
    const { visitorId, components } = await getVisitorData()

    const potPayloadObj = {
      fingerprintDebugJSON: FingerprintJS.componentsToDebugString(components),
      visitorId: visitorId,
      localeDateString: new Date().toLocaleString(),
      ipInfo: '',
      userAgent: navigator.userAgent,
      fingerprintTimeMs: 0,
    }

    // Attempt to look up client IP address and basic geoIP using free public API,
    // to save us needing an API key for that geoip lookup server side
    // We'll still log the client IP from server side too anyway, but this may also give us some extra data points
    jQuery
      .getJSON('https://api.db-ip.com/v2/free/self')
      .done(function (ipData) {
        potPayloadObj.fingerprintTimeMs = Date.now() - startTime
        potPayloadObj.ipInfo = ipData
        jQuery.post(potEndpoint, JSON.stringify(potPayloadObj))
      })
      .fail(function () {
        // Post whatever we have to the pot endpoing anyway, so we get fingerprint even if IP API fails
        jQuery.post(potEndpoint, JSON.stringify(potPayloadObj))
      })
  } catch (error) {
    const totalTime = Date.now() - startTime
    const potPayloadObj = {
      error: true,
      errorDump: JSON.stringify(error),
      userAgent: navigator.userAgent,
      fingerprintTimeMs: totalTime,
    }
    jQuery.post(potEndpoint, JSON.stringify(potPayloadObj))
    throw error
  }
}

startPlayground()
