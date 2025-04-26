import {
    Alignment,
    Button,
    ButtonGroup,
    Navbar,
    NavbarGroup,
    Intent,
  } from "@blueprintjs/core"
  import { useNavigate } from "react-router-dom"
  import { useAuth,SignInButton, SignUpButton, useUser, UserButton } from "@clerk/clerk-react"

export const AppNavbar = () => {

// using this to get user info like full name, profile picture, email, etc.
const  { user } = useUser();

// To check user is logged in if he is show profile picture and name
const {isSignedIn} = useAuth();

// User from react router dom to navigate on click of button
const Navigate = useNavigate();

const isAdmin = user?.publicMetadata?.role === 'admin';

    return (

// Navbar things
<Navbar>
    <NavbarGroup align={Alignment.LEFT}>
        <ButtonGroup style={{gap: '8px'}}>
            <Button text="Home" intent={Intent.PRIMARY} onClick={() => Navigate('/')} />
            <Button text="Sell" intent={Intent.DANGER} onClick={() => Navigate('/sell')} />
            <Button text="Dashboard" intent={Intent.SUCCESS} onClick={() => Navigate('/Dashboard')} />
                {isAdmin && isSignedIn && (
            <Button text="Admin" intent={Intent.WARNING} onClick={() => Navigate('/Admin')} />
                )}
        </ButtonGroup>
</NavbarGroup>

{/* this the check if the user is loged in or not to display sign in and sign up button or profile picture and name */}
{!isSignedIn ? (
  <NavbarGroup align={Alignment.RIGHT}>
    <ButtonGroup style={{gap: '8px'}}>
        <SignInButton mode="modal">
            <Button text="Sign In" />
        </SignInButton>
        <SignUpButton mode="modal">
            <Button text="Sign Up" />
         </SignUpButton>
    </ButtonGroup>
</NavbarGroup>
) : (
<NavbarGroup align={Alignment.RIGHT} style={{gap: '8px'}}>
    <Button 
      text={user?.fullName}
     className="readonly"
    />
    <UserButton afterSignOutUrl="/" />
</NavbarGroup>
    )
}
{/* this shows if the user is logged in ⬆️ */} 
</Navbar>
    )
}
