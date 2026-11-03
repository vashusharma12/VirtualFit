import { useDispatch, useSelector } from 'react-redux'
import { PHOTO_ANGLES } from '../../data/photoAngles'
import { deletePhoto, uploadPhoto } from '../../redux/slices/photosSlice'
import PhotoSlot from './PhotoSlot'

export default function PhotoGrid() {
  const dispatch = useDispatch()
  const { items, slots } = useSelector((s) => s.photos)

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {PHOTO_ANGLES.map((angle) => (
        <PhotoSlot
          key={angle.id}
          angle={angle}
          item={items[angle.id]}
          slot={slots[angle.id]}
          onUpload={(file) => dispatch(uploadPhoto({ angle: angle.id, file }))}
          onRemove={() => dispatch(deletePhoto(angle.id))}
        />
      ))}
    </div>
  )
}
