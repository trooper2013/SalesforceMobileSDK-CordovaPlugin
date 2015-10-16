console.log("Running SalesforceMobileSDK plugin android post-install script");
var targetAndroidApi = 21; 


//--------------------------------------
// Useful functions
//--------------------------------------
var fs = require('fs');
var exec = require('child_process').exec;
var path = require('path');

var copyFile = function(srcPath, targetPath) {
    fs.createReadStream(srcPath).pipe(fs.createWriteStream(targetPath));
};

var fixFile = function(path, fix) {
    fs.readFile(path, 'utf8', function (err, data) { 
        fs.writeFile(path, fix(data), function (err) {         
            if (err) { 
                console.log(err); 
            } 
        });
    });
};

// Function to fix AndroidManifest.xml
var fixAndroidManifest = function(data) {

    // Fix application tag
    var appName = "com.salesforce.androidsdk.smartsync.app.HybridAppWithSmartSync";

    // In case the script was run twice
    if (data.indexOf(appName) == -1) {

        var applicationTag = '<application android:hardwareAccelerated="true" android:icon="@drawable/sf__icon" android:label="@string/app_name" android:manageSpaceActivity="com.salesforce.androidsdk.ui.ManageSpaceActivity" android:name="' + appName + '">'
        data = data.replace(/<application [^>]*>/, applicationTag);

        // Comment out first activity
        data = data.replace(/<activity/, "<!--<activity");
        data = data.replace(/<\/activity>/, "</activity>-->");

        // Change min sdk version
        data = data.replace(/android\:minSdkVersion\=\"10\"/, 'android:minSdkVersion="17"');

        // Change target api
        data = data.replace(/android\:targetSdkVersion\=\"22\"/, 'android:targetSdkVersion="' + targetAndroidApi + '"');
    }

    return data;
};

var getAndroidSDKToolPath = function() {
    var androidHomeDir = process.env.ANDROID_HOME;
    if (typeof androidHomeDir !== 'string') {
        console.log('You must set the ANDROID_HOME environment variable to the path of your installation of the Android SDK.');
        return null;
    }

    var androidExePath = path.join(androidHomeDir, 'tools', 'android');
    var isWindows = (/^win/i).test(process.platform);
    if (isWindows) {
        androidExePath = androidExePath + '.bat';
    }
    if (!fs.existsSync(androidExePath)) {
        console.log('The "android" utility does not exist at ' + androidExePath + '.  Make sure you\'ve properly installed the Android SDK.');
        return null;
    }

    return androidExePath;
};

//--------------------------------------
// Doing actual post installation work
//--------------------------------------
var androidExePath = getAndroidSDKToolPath();
if (androidExePath === null) {
    process.exit(2);
}

var libProjectRoot = path.join('plugins', 'com.salesforce', 'src', 'android', 'libs');
var appProjectRoot = path.join('platforms', 'android');

console.log('Fixing application AndroidManifest.xml');
fixFile(path.join('platforms', 'android', 'AndroidManifest.xml'), fixAndroidManifest);

console.log('Moving Salesforce libraries to the correct location');
exec('cp -R ' + path.join(libProjectRoot, 'SalesforceSDK') + ' ' + appProjectRoot);
exec('cp -R ' + path.join(libProjectRoot, 'SmartStore') + ' ' + appProjectRoot);
exec('cp -R ' + path.join(libProjectRoot, 'SmartSync') + ' ' + appProjectRoot);

console.log('Fixing Gradle dependency paths in Salesforce libraries');
var oldCordovaDep = "compile project\(\':external:cordova:framework\'\)";
var oldSalesforceSdkDep = "compile project\(\':libs:SalesforceSDK\'\)";
var oldSmartStoreDep = "compile project\(\':libs:SmartStore\'\)";
exec("sed -i.bu " + "\"s/" + oldCordovaDep + "/" + "compile project\(\':CordovaLib\'\)" + "/g\" " + path.join(appProjectRoot, 'SalesforceSDK', 'build.gradle'));
exec("rm " + path.join(appProjectRoot, 'SalesforceSDK', 'build.gradle') + ".bu");
exec("sed -i.bu " + "\"s/" + oldSalesforceSdkDep + "/" + "compile project\(\':SalesforceSDK\'\)" + "/g\" " + path.join(appProjectRoot, 'SmartStore', 'build.gradle'));
exec("rm " + path.join(appProjectRoot, 'SmartStore', 'build.gradle') + ".bu");
exec("sed -i.bu " + "\"s/" + oldSmartStoreDep + "/" + "compile project\(\':SmartStore\'\)" + "/g\" " + path.join(appProjectRoot, 'SmartSync', 'build.gradle'));
exec("rm " + path.join(appProjectRoot, 'SmartSync', 'build.gradle') + ".bu");

console.log('Fixing root level Gradle file for the generated app');
exec("echo \'include \":SalesforceSDK\"\' >> " + path.join(appProjectRoot, 'settings.gradle'));
exec("echo \'include \":SmartStore\"\' >> " + path.join(appProjectRoot, 'settings.gradle'));
exec("echo \'include \":SmartSync\"\' >> " + path.join(appProjectRoot, 'settings.gradle'));

console.log("Done running SalesforceMobileSDK plugin android post-install script");
