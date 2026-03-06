const geoip = require("geoip-lite");

const getLocationFromIP = (ipAddress) => {
  if (!ipAddress || ipAddress === "::1" || ipAddress === "127.0.0.1") {
    return {
      country: "Unknown",
      region: "Unknown",
      city: "Unknown",
      ll: [0, 0],
      timezone: "UTC",
    };
  }

  const geo = geoip.lookup(ipAddress);

  if (!geo) {
    return {
      country: "Unknown",
      region: "Unknown",
      city: "Unknown",
      ll: [0, 0],
      timezone: "UTC",
    };
  }

  return {
    country: geo.country || "Unknown",
    region: geo.region || "Unknown",
    city: geo.city || "Unknown",
    ll: geo.ll || [0, 0],
    timezone: geo.timezone || "UTC",
  };
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (degrees) => {
  return degrees * (Math.PI / 180);
};

const detectImpossibleTravel = (lastLogin, currentLocation, timeDiffMinutes) => {
  if (!lastLogin || !lastLogin.location || !lastLogin.location.ll) {
    return { impossible: false, distance: 0, speed: 0 };
  }

  const [lastLat, lastLon] = lastLogin.location.ll;
  const [currentLat, currentLon] = currentLocation.ll;

  const distance = calculateDistance(lastLat, lastLon, currentLat, currentLon);

  if (timeDiffMinutes === 0) timeDiffMinutes = 1;

  const speed = distance / (timeDiffMinutes / 60);

  const MAX_REASONABLE_SPEED = 1000;

  return {
    impossible: speed > MAX_REASONABLE_SPEED,
    distance,
    speed,
    lastLocation: {
      country: lastLogin.location.country,
      city: lastLogin.location.city,
    },
    currentLocation: {
      country: currentLocation.country,
      city: currentLocation.city,
    },
  };
};

const isHighRiskCountry = (countryCode) => {
  const highRiskCountries = process.env.HIGH_RISK_COUNTRIES
    ? process.env.HIGH_RISK_COUNTRIES.split(",")
    : [];

  return highRiskCountries.includes(countryCode);
};

module.exports = {
  getLocationFromIP,
  calculateDistance,
  detectImpossibleTravel,
  isHighRiskCountry,
};
