items = doc.getElementsByClassName('tab');

for (const item of items)
{
    item.addEventListener('click', function(event)
    {
        for (const iterator of items)
        {
            iterator.classList.remove('active-tab');
        }
        item.classList.add('active-tab');
    })
}