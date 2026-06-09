import re
import os

file_path = r'f:\Tile erp\143\frontend\src\components\super-admin\SubscriptionPlanForm.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove newFeature state
content = re.sub(r'\s*const \[newFeature, setNewFeature\] = useState\(\'\'\);', '', content)

# Remove suggestedFeatures array
content = re.sub(r'\s*const suggestedFeatures = \[[^\]]*\];', '', content)

# Remove handleAddFeature and handleRemoveFeature
content = re.sub(r'\s*const handleAddFeature = \(\) => \{[\s\S]*?^\s*};\n', '\n', content, flags=re.MULTILINE)

# Remove validation for features
content = re.sub(r'\s*if \(\!formData\?\.features\?\.length\) \{[^}]*\}\n', '\n', content)

# Remove the Features Card
content = re.sub(r'\s*\{\/\* Features \*\/\}\s*<Col xs=\{12\}>\s*<Card>\s*<Card\.Header>[\s\S]*?<h6 className="mb-0 text-primary">Plan Features<\/h6>[\s\S]*?<\/Card>\s*<\/Col>', '', content)

# Remove styles
content = re.sub(r'\s*<style>\{`\s*\.feature-item \{[\s\S]*?`\}<\/style>', '', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
