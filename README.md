Locus is a Chrome OS kiosk app for displaying dashboards.

Currently it works with Okta SSO applications and Amazon CloudWatch dashboards.

## Chrome Web Store

### Private G Suite (recommended)

This method gives you more control over the version you are running in your company.

1. Download the latest release as a Zip file.
2. Upload to: https://chrome.google.com/webstore/developer/dashboard

Publishing a private application does not require any payment.

Additional information: https://developer.chrome.com/webstore/publish

### Public Chrome Webstore

https://chrome.google.com/webstore/detail/locus-dashboard/lopohefoojijnhfhhkdhnkoekimembeg

## Local Installation

1. Download or clone Locus.
2. Open the Google Chrome extensions page by navigating to chrome://extensions.
3. Enable developer mode by toggling the switch next to "Developer mode".
4. Click the "Load Unpacked" button and select the extension directory.

The application can be opened from the Apps page (chrome://apps/).

## Configuration Options

### Common

* Show Login Process - Tick this box to remove the loading overlay (useful for debugging)
* Force Reload Period - Most dashboards will automatically load new data.  If your specific application doesn't, specify a time in seconds and Locus will force-refresh your dashboard periodically.

### Okta

* Okta User Name - User name or email address for logging into Okta
* Okta Password - Corresponding password
* Okta Domain - The Okta site for your organization (e.g. `dev-000000.okta.com`)
* Okta Application Path - This is the URL path component of your App Embed Link for the desired application in Okta.  This can be found on the General tab of the Okta Application administration page towards the bottom where it says Embed Link.  Do not include the scheme or domain.  (e.g. `/home/nadev000000_samltestid_1/EdUTZ4p8AStiAvIHqtQb/XBg75QzT4B3Dpok9sPYq`)

* Application Destination URL - This is the full URL for your desired dashboard page.  Be sure to include any URL parameters to get the dashboard into the state you want (refresh options, full screen options, etc.).
* Application Logged Out Regex - Any time this regex matches the current URL, Locus will attempt to login to your application via Okta.  When you visit your desired dashboard page and you're not logged-in, what URL do you end up on?  Make sure this regex matches that URL.

### AWS CloudWatch

Note that CloudWatch is also supported via Okta if you have AWS integrated with Okta.

* Amazon CloudWatch URL - This is the URL for the desired CloudWatch dashboard (e.g. `https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=DemoDashboard;expand=true;autoRefresh=60;start=P7D`)
* AWS Account ID or Alias - https://docs.aws.amazon.com/IAM/latest/UserGuide/console_account-alias.html
* AWS IAM User Name - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html
* AWS IAM User Password - Corresponding password

### Security Considerations

Since this tool is designed to store credentials in cleartext within the G Suite admin console, it is important to take security precautions.

* Ensure that the credentials provide the minimum necessary access to display the dashboard (e.g. read-only access to the specific dashboard).
* Make sure you understand who has access to manage this configuration in the G Suite admin console.  Ensure this group is appropriately limited.
* IP whitelist the credentials.  Both Okta and AWS support various IP whitelisting.  Bonus if the dashboards have a separate static IP.

## Managed Kiosk Configuration

### Prerequisites

* An enterprise-enrolled Chrome OS device
* A local installation of Locus
* A private Chrome Web Store deployment of Locus (recommended)

### Configuration

1. Configure the local installation with settings and credentials
2. In the G Suite Admin console, move the dashboard device into its own Organizational Unit (https://support.google.com/a/answer/2978876)
3. Configure the OU to force install Locus and mark it as a Kiosk app (https://support.google.com/chrome/a/answer/6306504)
4. Select the Locus app to open the configuration panel on the right
5. In your local installation, click "Export JSON to Clipboard"
6. In the G Suite Admin console, in the configuration panel for Locus, paste into the Policy JSON section
7. Click Save at the top right

The Locus app should be pushed to your device with that config within a couple minutes.

Use multiple OUs to configure dashboards with different Locus settings.

## License

Locus is available under MIT License. See LICENSE.