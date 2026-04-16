'use client'

interface BigNumpadProps {
  onNumberClick: (num: string) => void
  onDelete: () => void
  onClear: () => void
}

export default function BigNumpad({ onNumberClick, onDelete, onClear }: BigNumpadProps) {
  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
  
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-lg sm:shadow-2xl">
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {numbers.map((num) => (
          <button
            key={num}
            onClick={() => onNumberClick(num)}
            className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-2xl sm:text-4xl font-bold py-4 sm:py-8 rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg active:scale-95 transition-all duration-150 touch-target"
          >
            {num}
          </button>
        ))}
        <button
          onClick={onClear}
          className="bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm sm:text-2xl font-bold py-4 sm:py-8 rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg active:scale-95 transition-all duration-150 touch-target"
        >
          <span className="hidden sm:inline">Hapus Semua</span>
          <span className="sm:hidden">Clear</span>
        </button>
        <button
          onClick={onDelete}
          className="bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm sm:text-2xl font-bold py-4 sm:py-8 rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg active:scale-95 transition-all duration-150 touch-target"
        >
          <span className="hidden sm:inline">← Hapus</span>
          <span className="sm:hidden">⌫</span>
        </button>
      </div>
    </div>
  )
}
