

"use client"
import Button from '@mui/joy/Button';
import { FormControl, TextField } from '@mui/material';
import { useState } from 'react';


const Login = () => {
    const [valueEmail, setValueEmail] = useState<string>("");
    const [valuePassword, setValuePassword] = useState<string>("");

    const handleChangeValueEmail = (event) => {
        setValueEmail(event.target.value);
    };

    const handleChangeValuePassword = (event) => {
        setValuePassword(event.target.value);
    }

    return (
        <div className='flex justify-center pt-64'>
            <FormControl className="gap-2 flex justify-center">
                <TextField required id='email' type='email' className='w-48' label="Email" variant="outlined" size='small'
                    value={valueEmail} onChange={handleChangeValueEmail} />
                <TextField required id='password' type='password' className='w-48' label="Password" variant="outlined" size='small'
                    value={valuePassword} onChange={handleChangeValuePassword} />
                <div className="flex justify-center">
                    <Button
                        onClick={() => {
                            console.log("submit => ", valueEmail, " => ", valuePassword);
                        }}
                        variant="solid"
                        className="w-24"
                        type='submit'
                    >
                        Submit
                    </Button>
                </div>
            </FormControl>
        </div>
    );
}

export default Login;