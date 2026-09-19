const mongoose = require("mongoose");
const models = require("./models.cjs");

mongoose.connect("mongodb://127.0.0.1:27017/vigilant_eye")
  .then(() => console.log("Connected to MongoDB for cleaning garbage records..."))
  .catch(err => console.error("Database connection failed:", err));

function isValidPlateFormat(plate) {
  if (!plate) return false;
  const cleaned = plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
  
  // Clean string should be between 4 and 11 characters
  if (cleaned.length < 4 || cleaned.length > 11) {
    return false;
  }

  // Must contain at least one digit and at least one letter
  const hasDigit = /[0-9]/.test(cleaned);
  const hasLetter = /[A-Z]/.test(cleaned);
  if (!hasDigit || !hasLetter) {
    return false;
  }

  // Standard Indian Plate
  const standardPattern = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$/;
  
  // BH Series Plate
  const bhPattern = /^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/;
  
  // Diplomatic Plate
  const diplomaticPattern = /^[0-9]{2,3}[A-Z]{2}[0-9]{2,4}$/;

  return standardPattern.test(cleaned) || bhPattern.test(cleaned) || diplomaticPattern.test(cleaned);
}

async function clean() {
  try {
    const vehicles = await models.Vehicle.find({});
    const realPlates = new Set(vehicles.map(v => v.plate.toUpperCase()));

    console.log("Analyzing scans and alerts...");

    // Find all scans
    const allScans = await models.Scan.find({});
    let deletedScansCount = 0;
    for (const scan of allScans) {
      const plateUpper = scan.plate.toUpperCase();
      if (!realPlates.has(plateUpper) && !isValidPlateFormat(plateUpper)) {
        // Delete this scan
        await models.Scan.deleteOne({ _id: scan._id });
        await models.VehicleTrackingHistory.deleteMany({ plate: scan.plate });
        deletedScansCount++;
      }
    }
    console.log(`Deleted ${deletedScansCount} garbage scan records.`);

    // Find all alerts
    const allAlerts = await models.Alert.find({});
    let deletedAlertsCount = 0;
    for (const alert of allAlerts) {
      const plateUpper = alert.plate.toUpperCase();
      if (!realPlates.has(plateUpper) && !isValidPlateFormat(plateUpper)) {
        // Delete associated audit logs, notifications, station alerts, and the alert itself
        await models.AlertAuditLog.deleteMany({ alert_id: alert._id });
        await models.AlertNotification.deleteMany({ alert_id: alert._id });
        await models.StationAlert.deleteMany({ alert_id: alert._id });
        await models.Alert.deleteOne({ _id: alert._id });
        deletedAlertsCount++;
      }
    }
    console.log(`Deleted ${deletedAlertsCount} garbage alert records.`);

    console.log("Cleanup complete!");
    mongoose.connection.close();
  } catch (err) {
    console.error("Error during cleanup:", err);
    mongoose.connection.close();
  }
}

// Run cleanup after small delay to let DB connect
setTimeout(clean, 1000);
