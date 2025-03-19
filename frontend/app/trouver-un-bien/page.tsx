import { Card, CardActionArea, CardContent, CardMedia, TextareaAutosize, TextField } from '@mui/material';
import * as React from 'react';

export default function FindRealEstate() {

  return (
    <div>
      <div className="flex justify-center py-10">
        <TextField id="research" label="Rechercher un bien ou autre..." variant="outlined" className='w-[300px]'/>
      </div>
      <div className="flex flex-row max-w-300 max-h-200 pl-6 gap-6">
        <CardActionArea>
        <Card className="w-full h-full" raised>
            <CardMedia
              component="img"
              image="/apartments/apartment_1.jpg"
              alt="Paella dish"
              className="opacity-50 h-full"
            />
        </Card>
        </CardActionArea>
        <CardActionArea>
        <Card className="w-full" raised>
            <CardMedia
              component="img"
              image="/apartments/apartment_2.jpg"
              alt="Paella dish"
              className="opacity-50"
              />
        </Card>
        </CardActionArea>
      </div>
    </div>
  );
}
