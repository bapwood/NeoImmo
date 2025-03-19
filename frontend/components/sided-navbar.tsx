'use client';
import React from "react";
import Link from 'next/link';
import HomeIcon from '@mui/icons-material/Home';
import ApartmentIcon from '@mui/icons-material/Apartment';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';

const SidedNavbar = () => {
  return (
    <div className="w-[100px] h-screen border-r-2 border-[#c9c9c9] md:flex">
      <div className="flex flex-col space-y-6 w-full">
        <Link href="/" className="flex justify-center py-6">
          <img
            src="NeoImmo_logo_nobg.png"
          />
        </Link>

        <div className="grid content-center h-full gap-6">
          <Link href="/" className="justify-self-center">
            <HomeIcon fontSize="large" className="text-[#c9c9c9] hover:text-[#8a7cff]"/>
          </Link>
          <Link href="/trouver-un-bien" className="justify-self-center">
            <ApartmentIcon fontSize="large" className="text-[#c9c9c9] hover:text-[#8a7cff]"/>
          </Link>
          <Link href="/portefeuille" className="justify-self-center">
            <AccountBalanceWalletIcon fontSize="large" className="text-[#c9c9c9] hover:text-[#8a7cff]"/>
          </Link>
          <Link href="/mon-compte" className="justify-self-center">
            <PersonIcon fontSize="large" className="text-[#c9c9c9] hover:text-[#8a7cff]"/>
          </Link>
        </div>
        <div className="h-32">
          <Link href="/reglages" className="flex justify-center py-6">
            <SettingsIcon fontSize="large" className="text-[#c9c9c9] hover:text-[#8a7cff]"/>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SidedNavbar;