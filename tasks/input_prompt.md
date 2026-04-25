1.⁠ ⁠ONE-CLICK REGISTER/LOGIN (Passwordless & Instant):
•⁠  ⁠Implement Google Sign-In and Apple Sign-In (OAuth) using Firebase Auth or Supabase. 
•⁠  ⁠The UX must be literally one-click: User taps "Continue with Google/Apple", email is automatically verified via the provider, and user instantly enters the home screen. No extra form filling.

2.⁠ ⁠BLUR TOOL FOR PDF & JPG (Freemium Model):
•⁠  ⁠Allow users to select areas on a canvas (PDF page or JPG) to apply a blur effect locally (using Canvas API or OpenCV).
•⁠  ⁠Implement a usage limit logic (e.g., Free users can only apply 2 blur areas per document). 
•⁠  ⁠If the user exceeds the limit, trigger the "Premium Subscription Paywall" UI.

3.⁠ ⁠PDF LOCK / PASSWORD PROTECT (Premium Only):
•⁠  ⁠Implement local PDF encryption (using a library like ⁠ pdf-lib ⁠).
•⁠  ⁠The user inputs a password, and the app exports a Secure AES-256 Encrypted PDF.
•⁠  ⁠Wrap this entire feature in a Premium Check. If the user is not subscribed, redirect to the Paywall.

4.⁠ ⁠METADATA STRIPPER FOR PDF & JPG (Premium Only):
•⁠  ⁠Build a selective metadata cleaner. 
•⁠  ⁠UI: Provide checkboxes for the user to select what to strip (e.g., [x] Author, [x] Creation Date, [x] GPS Location, [x] Select All/Nuclear Clean).
•⁠  ⁠Implement local processing to read Exif/PDF dictionary, wipe selected data, and rebuild the file.
•⁠  ⁠Wrap in a Premium Check.

5.⁠ ⁠PRIVACY POLICY SCREEN:
•⁠  ⁠Generate a highly readable, professional Privacy Policy UI screen.
•⁠  ⁠Key clauses to emphasize in the text: "Amnesia Total" (No history saved), 100% On-Device Processing, no cloud storage, and zero data selling. 

6.⁠ ⁠IN-APP PURCHASE (IAP) SYSTEM:
•⁠  ⁠Implement the payment gateway using RevenueCat SDK (to seamlessly handle both Apple App Store and Google Play Store subscriptions).
•⁠  ⁠Create a 'SubscriptionService' class to check user entitlement (⁠ isPro ⁠) globally across the app to unlock features 2, 3, and 4.
