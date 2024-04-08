import { ChangeEvent, FormEvent, useRef, useState } from "react";

function App() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [textInput, setTextInput] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      if (fileRef.current?.files) {
        const file = fileRef.current.files[0];
        if (!file) {
          console.error("No file selected");
          alert("No file selected");
          return;
        }

        const filename = encodeURIComponent(file.name);
        const url = `https://4suvu2g6q0.execute-api.us-east-1.amazonaws.com/prod/presigned-url?filename=${filename}`;

        const presignedUrlResponse = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        const presignedData = await presignedUrlResponse.json();
        const bucketName = presignedData.bucketName;
        const presignedUrl = presignedData.uploadUrl;
        // Upload file to presigned URL
        const uploadResponse = await fetch(presignedUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": "application/octet-stream",
          },
        });

        if (!uploadResponse.ok) {
          throw new Error("File upload failed");
        }

        console.log("Upload successful");

        // save details to DDB
        const saveDetailsResponse = await fetch(
          "https://4suvu2g6q0.execute-api.us-east-1.amazonaws.com/prod/save-details",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              inputText: textInput,
              inputFilePath: `${bucketName}/${filename}`,
            }),
          }
        );

        if (!saveDetailsResponse.ok) {
          throw new Error("Saving details to DynamoDB failed");
        }

        const saveDetailsData = await saveDetailsResponse.json();
        console.log("Details saved to DynamoDB:", saveDetailsData);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error("An unexpected error occurred");
      }
    }
  };
  return (
    <div className="h-screen w-full bg-gray-800 flex justify-center items-center">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-100">
            Text Input
          </label>
          <input
            type="text"
            value={textInput || ""}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            placeholder="Type here..."
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setTextInput(e.target.value)
            }
            required
          />
        </div>
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-100">
            File Input
          </label>
          <input
            ref={fileRef}
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50"
            type="file"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600"
        >
          Submit
        </button>
      </form>
    </div>
  );
}

export default App;
