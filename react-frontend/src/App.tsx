function App() {
  const handleSubmit = (event) => {
    event.preventDefault();
  };

  return (
    <div className="h-screen w-full bg-gray-800 flex justify-center items-center">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="first_name"
            className="block mb-2 text-sm font-medium text-gray-100"
          >
            Text Input
          </label>
          <input
            type="text"
            id="first_name"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            placeholder="Type here..."
            required
          />
        </div>
        <div>
          <label
            className="block mb-2 text-sm font-medium text-gray-100"
            htmlFor="file_input"
          >
            File Input
          </label>
          <input
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50"
            id="file_input"
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
