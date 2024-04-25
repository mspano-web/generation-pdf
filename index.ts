import fs from 'fs';
import csvParser from 'csv-parser';
import PDFDocument from 'pdfkit';

async function generateAwardLetters(inputFilePath: string, modelFilePath: string) {
    const modelContent = fs.readFileSync(modelFilePath, 'utf-8');

    // Create a reading stream from the file 'award-winning-list.csv'
    fs.createReadStream(inputFilePath)
        // pipe() connects the CSV file read stream to the CSV parser, which is created using the csvParser() function. 
        //      The CSV parser is configured with the ';' field separator.
        // The CSV parser will process the lines of the CSV file and emit events for each row. 
        //      This allows the code to handle each row of the CSV file as it is read.
        .pipe(csvParser({ separator: ';' }))
        // 'data' event is fired every time the data stream emits a new data fragment, 
        //      in this case it corresponds to a row of the CSV file.
        .on('data', (data: any) => {
            // Checks if data contains a property called 'FIRST-NAME' or 'LAST-NAME'
            if (!data['FIRST-NAME'] || !data['LAST-NAME'] || !data.CONCEPT || !data.AMOUNT) {
                console.error('Error: Incomplete data found in CSV');
                return;
            }

            const trimmedFirstName = data['FIRST-NAME'].trim();
            const trimmedLastName = data['LAST-NAME'].trim();

            // Checks if the value of 'FIRST-NAME' or 'LAST-NAME', after removing whitespace, is an empty string
            if (!trimmedFirstName || !trimmedLastName) {
                console.error('Error: Empty first name or last name found in CSV');
                return;
            }

            const outputFileName = `${trimmedLastName}, ${trimmedFirstName}.pdf`;
            const outputFilePath = `./${outputFileName}`;

            // modelContent is a string containing the model letter text.
            // replace() finds all occurrences of: {FIRST-NAME},{LAST-NAME}, {CONCEPT} and {AMOUNT} 
            //      in the model content and replaces them with the value of the data retrieved from the input file
            const letterContent = modelContent
                .replace('{LAST-NAME}', trimmedLastName)
                .replace('{FIRST-NAME}', trimmedFirstName)
                .replace('{CONCEPT}', data.CONCEPT.trim())
                .replace('{AMOUNT}', parseFloat(data.AMOUNT).toFixed(2));

            // Create a new instance of a PDF document
            const pdfDoc = new PDFDocument();
            // pipe() connect the output of one data stream (in this case, the PDF document data stream)
            //       to the input of another stream (in this case, the write stream to the file on the file system).
            pdfDoc.pipe(
                // fs.createWriteStream() creates a write stream to a file specified by the outputFilePath path. 
                //      This write flow will be used to write the PDF document data to the file.
                fs.createWriteStream(outputFilePath)
            );

            pdfDoc.font('Helvetica').fontSize(12);

            // Divide the content of the letter into individual lines. 
            const lines = letterContent.split('\n');

            // Iterate over each output line
            lines.forEach(line => {
                // text() adds the text to the PDF document
                //      (width: 500) – Text will wrap if it exceeds this width
                //      (align: 'justify') – The text is distributed evenly on the line.
                // This content will be written directly to the output file by the stream redirection done previously
                pdfDoc.text(line, { width: 500, align: 'justify' });
            });

            // All writing operations on the PDF are completed and the PDF generation process is completed.
            pdfDoc.end();

            console.log(`Generated letter for ${trimmedFirstName} ${trimmedLastName}`);
        })
        // 'end' - issued once all write operations have completed successfully. 
        //      It means that the PDF has been completely generated.
        .on('end', () => {
            console.log('All letters generated successfully!');
        })
        .on('error', (error: any) => {
            console.error('Error:', error);
        });
}






const inputFilePath = 'award-winning-list.csv';
const modelFilePath = 'model-award-letter.txt';

generateAwardLetters(inputFilePath, modelFilePath)
    .catch(error => console.error('Error:', error));
