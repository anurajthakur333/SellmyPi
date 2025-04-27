import { Card, H1, InputGroup, FileInput, FormGroup, Button, NumericInput,Toaster, Intent} from "@blueprintjs/core"
import { useState,useEffect } from "react";
import getPiPrice from "./Service/coingeckoService";
import { uploadToCloudinary } from './Service/cloudinary';
import { useUser,useAuth } from "@clerk/clerk-react";

// Updated type for user information
type UserInfo = {
  id: string;
  username: string;
  email: string;
  phone: string;
};

// Updated transaction type with userInfo object
type TransactionData = {
  piAmount: number;
  usdValue: string;
  inrValue: string;
  upiId: string;
  imageUrl: string;
  userInfo: UserInfo;
  SellRateUsd: string;
  SellRateInr: string;
};

// Sell page all toasters
const AppToaster = Toaster.create();

export const Sell = () => {

// using this to get user info like full name, profile picture, email, etc.
  const { user } = useUser();
  //check if user is signed in
  const { isSignedIn } = useAuth();
  //if user is not signed in, redirect to sign in page


// Store prices
// useState lets you create and update data that can change over time
// piCoin stores currency values, updatePiCoin to update the values typed by user on frontend
const [piCoin, updatePiCoin] = useState({ usd: "", inr: "" })


// Load prices when page opens
// When the page loads, useEffect runs code
// useEffect runs code when the page first loads or when certain values change
useEffect(() => {
// getPiPrice is a function that gets the price of pi coin from the coingecko api
// Call the getPiPrice /Service/coingeckoService.ts
  getPiPrice().then(updatePiCoin)
}, [])  // empty [] means run only once when page loads


// Calculate amount
// amount stores how many Pi coins user wants to sell
// setAmount is used to update this number when user types
const [amount, setAmount] = useState(0);


 // Create storage for UPI ID
 // stores the UPI ID that user types (like phone@upi)
 // setUpi updates UPI ID when user types
 const [upi, setUpi] = useState('');


// Add selectedFile state to store the file temporarily
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [previewUrl, setPreviewUrl] = useState<string>('');


// Save image info

// image loading
const [busy, setBusy] = useState(false);
// Save image to cloud
const saveImg = (e: React.ChangeEvent<HTMLInputElement>) => {
  // Check if user is signed in first
  if (!isSignedIn) {
    AppToaster.show({
      message: "Please sign in before uploading images",
      intent: "warning",
      icon: "warning-sign",
      timeout: 3000
    });
    e.target.value = '';
    return;
  }

  const file = e.target.files?.[0];
  if (!file) {
    setSelectedFile(null);
    setPreviewUrl('');
    return;
  }

  // Create a preview URL for the selected file
  const preview = URL.createObjectURL(file);
  setPreviewUrl(preview);
  setSelectedFile(file);
};



















//API to send data to backend
const submitToBackend = async (data: TransactionData) => {
  const response = await fetch('http://localhost:3000/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) throw new Error('Transaction failed');
  return response.json();
};











//handle submit button
const handleSubmit = async () => {
// using this to get {user} info like full name, profile picture, email, etc.
//checks if the user is signed in.
// isSignedIn = "Do you have a ticket?"
// user = "And does the ticket have all the needed information?"
  if (!isSignedIn || !user) {
    AppToaster.show({
      message: "Please sign in to continue",
      intent: "warning",
      icon: "warning-sign",
      timeout: 3000
    });
    return;
  }

  // Check if all required fields are filled
  if (!amount || !upi || !selectedFile) {
    AppToaster.show({
      message: "Please fill all required fields",
      intent: "warning",
      icon: "warning-sign",
      timeout: 3000
    });
    return;
  }

  try {
    setBusy(true);

    // Upload image to Cloudinary first
    const imageUrl = await uploadToCloudinary(selectedFile);

    // Create user info object with all relevant user data
    const userInfo: UserInfo = {
      id: user.id,
      username: user.username || user.firstName || 'Anonymous',
      email: user.emailAddresses[0].emailAddress || 'No Email Provided',
      phone: user.phoneNumbers?.[0]?.phoneNumber || 'No Phone Number Provided'
    };
    
    // Create transaction data with the uploaded image URL
    const transactionData: TransactionData = {
      piAmount: amount,
      usdValue: (amount * Number(piCoin.usd)).toFixed(2),
      inrValue: (amount * Number(piCoin.inr)).toFixed(2),
      upiId: upi,
      imageUrl: imageUrl,
      userInfo: userInfo,
      SellRateUsd: piCoin.usd,
      SellRateInr: piCoin.inr
    };

    // Send data to backend server
    await submitToBackend(transactionData);

    // Reset all form fields
    setAmount(0);
    setUpi('');
    setSelectedFile(null);
    setPreviewUrl('');
    
    // Clear the file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';

    AppToaster.show({
      message: "Transaction submitted successfully!",
      intent: "success",
      icon: "tick",
      timeout: 1000,
    });

  } catch (error) {
    AppToaster.show({
      message: "Failed to submit transaction",
      intent: "danger",
      icon: "error"
    });
  } finally {
    setBusy(false);
  }
};















return (

<div className="page-container">

                  <Card style={{ marginBottom: '15px' }}>
  <H1>SellmyPi</H1>
    <p>Sell your Pi Coins in real time.</p>

{/* Pi Network Price Real time */}

<div style={{ marginTop: "10px", display: "flex", gap:'10px'}}>
    <Button intent="primary">USD: ${piCoin.usd}</Button>
    <Button intent="success">INR: ₹{piCoin.inr}</Button>
</div>
                            </Card>





                        <Card>


{/* Pi Network Crypto amount*/}
<FormGroup label="Enter Pi Amount" labelInfo="(required)">
  <NumericInput value={amount} onValueChange={setAmount} min={0} style={{ width: "200px" }}/>
  {amount > 0 && (
<div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
  <Button>USD: ${(amount * Number(piCoin.usd)).toFixed(2)}</Button>
  <Button>INR: ₹{(amount * Number(piCoin.inr)).toFixed(2)}</Button>
</div>
  )}
</FormGroup>


{/* upi fill input */}

<FormGroup label="UPI" labelInfo="(required)">
  <InputGroup placeholder="UPI ID" leftIcon="credit-card" value={upi} onValueChange={setUpi} style={{ maxWidth: "200px" }}/>
</FormGroup>




{/* image upload */}

<FormGroup label="Upload Payment Screenshot">
  <FileInput 
    text={busy ? "⏳ Uploading..." : !isSignedIn ? "🔒 Sign in" : "Select Image"}
    onInputChange={saveImg}
    disabled={busy || !isSignedIn}
    inputProps={{
      accept: ".jpg,.jpeg,.png",
    }}
    style={{ width: "200px" }}
  />
  {/* Preview image */}
  {previewUrl && (
    <img 
      src={previewUrl} 
      style={{ 
        display: "flex", 
        marginTop: "10px", 
        maxWidth: '100px', 
        borderRadius: '2px', 
        border: '1px solid #ddd' 
      }} 
    />
  )}
</FormGroup>


<Button 
  text="Submit !" 
  intent={Intent.PRIMARY} 
  style={{marginTop: '20px'}}  
  onClick={handleSubmit} 
  disabled={!amount || !upi || !selectedFile || busy}
/>

                    </Card>


</div>
  )
} 